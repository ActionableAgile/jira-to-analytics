package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
//	"io/ioutil" // for displaying json
)

// Jira data structures for unmarshalling from JSON
type JiraIssueList struct {
	Issues []JiraIssue
}

type JiraIssue struct {
	Key       string
	Fields    interface{}
	Changelog JiraChangelog
}

type JiraChangelog struct {
	Total     int
	Histories []JiraHistory
}

type JiraHistory struct {
	Id      string
	Items   []JiraItem
	Created string
}

type JiraItem struct {
	Field    string
	ToString string
}

// collect work items for writing to file
type Item struct {
	Id         string
	StageDates []string
	Name       string
	Type       string
	Attributes []string
}

func getItems(keys []string, config *Config) ([]*Item, error) {
	var items []*Item

	// build url
	jql := "key in (" + strings.Join(keys, ",") + ")"
	url := fmt.Sprint(config.UrlRoot, "?jql=", url.QueryEscape(jql), "&maxResults=", len(keys),
		"&expand=changelog")

	// get credentials
	credentials, err := config.GetCredentials()
	if err != nil {
		return nil, err
	}

	// send the request
	client := http.Client{}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+credentials)
	resp, _ := client.Do(req)

	// process the response
	if resp != nil && resp.StatusCode == 200 { // OK
		defer resp.Body.Close()

/*
		// print the json
		bodyBytes, _ := ioutil.ReadAll(resp.Body)
		bodyString := string(bodyBytes)
		fmt.Println(bodyString)
		return items, nil
*/

		// decode json
		var list JiraIssueList
		json.NewDecoder(resp.Body).Decode(&list)

		// extract work item info
		for _, issue := range list.Issues {
			item := NewItem(issue.Key, config)

			// extract name, which must not contain characters that cause problems for CSV
			fields := issue.Fields.(map[string]interface{})
			name := fields["summary"].(string)
			name = strings.Replace(name, "\"", "", -1)
			name = strings.Replace(name, ",", "", -1)
			name = strings.Replace(name, "\\", "", -1)
			item.Name = "\"" + name + "\""

			// accumulate out-of-order events so we can handle backward flow
			events := make([][]string, len(config.StageNames))
			if config.CreateInFirstStage {
				creationDate := strings.SplitN(fields["created"].(string), "T", 2)[0]
				events[0] = append(events[0], creationDate)
			}
			for _, history := range issue.Changelog.Histories {
				for _, jItem := range history.Items {
					if jItem.Field == "status" {
						stageString := jItem.ToString
						if stageIndex, found := config.StageMap[stageString]; found {
							date := strings.SplitN(history.Created, "T", 2)[0]
							events[stageIndex] = append(events[stageIndex], date)
						}
					}
				}
			}

			// for each stage use min date that is >= max date from previous stages
			previousMaxDate := ""
			for stageIndex := range config.StageNames {
				stageBestDate := ""
				stageMaxDate := ""
				for _, date := range events[stageIndex] {
					if date >= previousMaxDate && (stageBestDate == "" || date < stageBestDate) {
						stageBestDate = date
					}
					if date > stageMaxDate {
						stageMaxDate = date
					}
				}
				if stageBestDate != "" {
					item.StageDates[stageIndex] = stageBestDate
				}
				if stageMaxDate != "" && stageMaxDate > previousMaxDate {
					previousMaxDate = stageMaxDate
				}
			}

			// extract work item type
			if len(config.Types) > 0 {
				typeStruct := fields["issuetype"] // interface{}
				typeName := typeStruct.(map[string]interface{})
				item.Type = typeName["name"].(string)
			}

			// extract attributes
			for i, a := range config.Attributes {

				// handle customfield
				if strings.HasPrefix(a.FieldName, "customfield_") {
					genericStruct := fields[a.FieldName] // interface{}
					if genericStruct != nil {
						genericFields := genericStruct.(map[string]interface{})
						item.Attributes[i] = genericFields["value"].(string)
					}

				// handle predefined fields (can be struct, array of strings, array of structs)
				} else {
					switch a.FieldName {
					case "status":
						item.Attributes[i] = genericStructValue(fields, "status", "name");
					case "issuetype":
						item.Attributes[i] = genericStructValue(fields, "issuetype", "name");
					case "priority":
						item.Attributes[i] = genericStructValue(fields, "priority", "name");
					case "resolution":
						item.Attributes[i] = genericStructValue(fields, "resolution", "name");
					case "labels":
						item.Attributes[i] = genericStructValue(fields, "labels", "");
					}
				}
			}

			items = append(items, item)
		}
	} else {
		// it doesn't matter why because since all the ids worked we're just going to retry
		return nil, fmt.Errorf("Failed")
	}

	return items, nil
}

// if child refers to a struct, return the named field
// if child refers to an array, it could be an array of strings or structs. Either way,
// return a list of the fields as [a\,b\,c] or just a (no brackets) if only one
func genericStructValue(parent map[string]interface{}, child, field string) (result string) {
	genericChild := parent[child] // interface{}
	if genericChild != nil {
		switch genericChild.(type) {
		case map[string]interface{}:
			result = strings.TrimSpace(genericChild.(map[string]interface{})[field].(string))
		case []interface{}:
			genericArray := genericChild.([]interface{})
			stringArray := make([]string, 0, len(genericArray))
			for _, element := range genericArray {
				var s string
				switch element.(type) {
				case map[string]interface{}:
					s = element.(map[string]interface{})[field].(string)
				case string:
					s = element.(string)
				}
				s = strings.TrimSpace(s)
				if len(s) > 0 {
					stringArray = append(stringArray, s)
				}
			}
			if len(stringArray) == 1 {
				result = stringArray[0]
			} else if len(stringArray) > 1 {
				result = "[" + strings.Join(stringArray, "\\,") + "]"
			}
		}
	}
	return
}

func NewItem(key string, config *Config) *Item {
	return &Item{
		Id:         key,
		StageDates: make([]string, len(config.StageNames)),
		Attributes: make([]string, len(config.Attributes)),
	}
}

func (w *Item) HasDate() bool {
	result := false
	for _, date := range w.StageDates {
		if len(date) > 0 {
			result = true
			break
		}
	}
	return result
}

func (w *Item) String(config *Config, writeLink bool) string {
	var buffer bytes.Buffer
	buffer.WriteString(w.Id)
	buffer.WriteString(",")
	if writeLink {
		buffer.WriteString(config.Domain + "/browse/" + w.Id)
	}
	buffer.WriteString("," + w.Name)
	for _, stageDate := range w.StageDates {
		buffer.WriteString("," + stageDate)
	}
	for _, value := range w.Attributes {
		buffer.WriteString("," + value)
	}
	return buffer.String()
}
