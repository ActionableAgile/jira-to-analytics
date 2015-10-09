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

func getItems(issueBatchSize int, currentStartIndex int, showQuery bool, config *Config) ([]*Item, error) {
	var items []*Item

	// build url
	jql := ""
	var clauses []string
	if len(config.ProjectNames) == 1 {
		clauses = append(clauses, "project="+config.ProjectNames[0])
	} else if len(config.ProjectNames) > 1 {
		clauses = append(clauses, "project in ("+strings.Join(config.ProjectNames, ",")+")")
	}
	if len(config.Types) > 0 {
		clauses = append(clauses, "issuetype in ("+strings.Join(config.Types, ",")+")")
	}

	for _, filter := range config.Filters {
		clauses = append(clauses, "filter="+filter)
	}

	jql = strings.Join(clauses, " AND ") + " order by id"

	// build url
	url := fmt.Sprint(config.UrlRoot, "?jql=", url.QueryEscape(jql), "&maxResults=", issueBatchSize, "&startAt=", currentStartIndex, "&expand=changelog")

	// get credentials
	credentials, err := config.GetCredentials()
	if err != nil {
		return nil, err
	}

	if(showQuery) {
		fmt.Println("\t==> Requested URL:")
		fmt.Println("\t==>", url)	
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
			item.Name = name

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
					item.Attributes[i] = getValue(fields, a.FieldName, a.ContentName)

					// handle predefined fields (can be struct, array of strings, array of structs)
				} else {
					switch a.FieldName {
					case "status":
						item.Attributes[i] = getValue(fields, "status", "name")
					case "issuetype":
						item.Attributes[i] = getValue(fields, "issuetype", "name")
					case "priority":
						item.Attributes[i] = getValue(fields, "priority", "name")
					case "resolution":
						item.Attributes[i] = getValue(fields, "resolution", "name")
					case "project":
						item.Attributes[i] = getValue(fields, "project", "name")
					case "labels":
						item.Attributes[i] = getValue(fields, "labels", "")
					case "fixVersions":
						item.Attributes[i] = getValue(fields, "fixVersions", "")
					case "components":
						item.Attributes[i] = getValue(fields, "components", "")
					}
				}
			}

			items = append(items, item)
		}
	} else {
		name := ""
		info := ""
		switch resp.StatusCode {
		case 400:
			name = "400 (Bad request)"
			info = "Possible causes:\n" +
				   " - A project doesn't exist\n" +
				   " - A filter doesn't exist\n" +
                   " - Nested comma, quote, or backslash"
            case 401:
                name = "401 (Not Authorized)"
                info = "Possible causes\n:" +
                    " - Incorrect username or password\n" +
                    " - Your server doesn't support basic authentication\n" +
                    " - You are trying to use OAuth"
            case 404:
                name = "404 (Not Found)"
                info = "Perhaps your domain is mispelled?"
		}
		return nil, fmt.Errorf("Response Status Code %s\n%s\nURL: %s\nJQL: %s\n",
            			name, info, config.UrlRoot, jql)

	}

	return items, nil
}

// if child refers to a struct, return its named content field
// if child refers to an array, it could be an array of strings or structs. Either way,
//   return a list of the content as [a;b;c] or just a (no brackets) if only one
func getValue(parent map[string]interface{}, child, contentName string) (result string) {
	genericChild := parent[child] // interface{}
	if genericChild != nil {
		switch genericChild.(type) {
		case map[string]interface{}: // actually a struct
			genericStruct := genericChild.(map[string]interface{})
			if content, ok := genericStruct[contentName]; ok {
				result = content.(string)
			}
		case []interface{}: // an array of something
			genericArray := genericChild.([]interface{})
			stringArray := make([]string, 0, len(genericArray))
			for _, element := range genericArray {
				var s string
				switch element.(type) {
				case map[string]interface{}: // the array contains structs
					genericStruct := element.(map[string]interface{})
					if content, ok := genericStruct[contentName]; ok {
						s = content.(string)
					}
				case string: // the array contains strings
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
				result = "[" + strings.Join(stringArray, ";") + "]"
			}
		case string:
			result = genericChild.(string)
		}
	}
	return
}

// put quotes around it unless it already has them
func quoteString(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "\"") {
		return s
	}
	return "\"" + s + "\""
}

func NewItem(key string, config *Config) *Item {
	return &Item{
		Id:         key,
		StageDates: make([]string, len(config.StageNames)),
		Attributes: make([]string, len(config.Attributes)),
	}
}

func (item *Item) HasDate() bool {
	result := false
	for _, date := range item.StageDates {
		if len(date) > 0 {
			result = true
			break
		}
	}
	return result
}

func (item *Item) toCSV(config *Config, writeLink bool) string {
	var buffer bytes.Buffer
	buffer.WriteString(item.Id)
	buffer.WriteString(",")
	if writeLink {
		buffer.WriteString(config.Domain + "/browse/" + item.Id)
	}
	buffer.WriteString("," + quoteString(item.Name))
	for _, stageDate := range item.StageDates {
		buffer.WriteString("," + stageDate)
	}
	for _, value := range item.Attributes {
		buffer.WriteString("," + value)
	}
	return buffer.String()
}

func (item *Item) toJSON(config *Config, writeLink bool) string {
	var buffer bytes.Buffer
	buffer.WriteString("[")
	buffer.WriteString(quoteString(item.Id))
	if writeLink {
		buffer.WriteString("," + quoteString(config.Domain+"/browse/"+item.Id))
	} else {
		buffer.WriteString("," + quoteString(""))
	}
	buffer.WriteString("," + quoteString(item.Name))
	for _, stageDate := range item.StageDates {
		buffer.WriteString("," + quoteString(stageDate))
	}
	for _, value := range item.Attributes {
		buffer.WriteString("," + quoteString(value))
	}
	buffer.WriteString("]")
	return buffer.String()
}
