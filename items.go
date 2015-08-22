package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
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
	Custom     []string
}

func getItems(keys []string, config *Config) (items []*Item, error *string) {
	error = nil

	// build url
	jql := "key in (" + strings.Join(keys, ",") + ")"
	url := fmt.Sprint(config.urlRoot, "?jql=", url.QueryEscape(jql), "&maxResults=", len(keys),
		"&expand=changelog")

	// get credentials
	credentials, err := config.getCredentials()
	if err != nil {
		error = err
		return
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
			events := make([][]string, len(config.stageNames))
			if config.createInFirstStage {
				creationDate := strings.SplitN(fields["created"].(string), "T", 2)[0]
				events[0] = append(events[0], creationDate)
			}
			for _, history := range issue.Changelog.Histories {
				for _, jItem := range history.Items {
					if jItem.Field == "status" {
						stageString := jItem.ToString
						if stageIndex, found := config.stageMap[stageString]; found {
							date := strings.SplitN(history.Created, "T", 2)[0]
							events[stageIndex] = append(events[stageIndex], date)
						}
					}
				}
			}

			// for each stage use min date that is >= max date from previous stages
			previousMaxDate := ""
			for stageIndex := range config.stageNames {
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
			if len(config.types) > 0 {
				typeStruct := fields["issuetype"] // interface{}
				typeName := typeStruct.(map[string]interface{})
				item.Type = typeName["name"].(string)
			}

			// extract custom fields
			for k, v := range config.customFields {
				customStruct := fields[v] // interface{}
				if customStruct != nil {
					customName := customStruct.(map[string]interface{})
					item.Custom[k] = customName["value"].(string)
				}
			}

			items = append(items, item)
		}
	} else {
		// it doesn't matter why because since all the ids worked we're just going to retry
		*error = "Failed"
		return
	}

	return
}

func NewItem(key string, config *Config) *Item {
	return &Item{
		Id:         key,
		StageDates: make([]string, len(config.stageNames)),
		Custom:     make([]string, len(config.customFields)),
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
		buffer.WriteString(config.domain + "/browse/" + w.Id)
	}
	buffer.WriteString("," + w.Name)
	for _, stageDate := range w.StageDates {
		buffer.WriteString("," + stageDate)
	}
	if len(config.types) > 0 {
		buffer.WriteString("," + w.Type)
	}
	for _, value := range w.Custom {
		buffer.WriteString("," + value)
	}
	return buffer.String()
}
