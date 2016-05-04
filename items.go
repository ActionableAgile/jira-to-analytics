package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
)

const PRINT_JSON = false

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

// for extracting project names
type JiraProjectList []JiraProject

type JiraProject struct {
	Key  string
	Name string
}

// for extracting workflows
type JiraWorkflowList []JiraWorkflow

type JiraWorkflow struct {
	Name     string
	Statuses []JiraStatus
}

type JiraStatus struct {
	Name string
}

// collect work items for writing to file
type Item struct {
	Id         string
	StageDates []string
	Name       string
	Type       string
	Attributes []string
}

// keep track of stage scores
type StageScore struct {
	Name   string
	Wins   int
	Issues int
}

type ScoreMap map[string]StageScore

type Scores []StageScore

func (s StageScore) String() string {
	return fmt.Sprintf("%s: %.2f (%d/%d)\n", s.Name, s.Value(), s.Wins, s.Issues)
}

func (score StageScore) Value() float32 { return float32(score.Wins) / float32(score.Issues) }

func (scoreMap ScoreMap) ToArray() (scores Scores) {
	for _, score := range scoreMap {
		scores = append(scores, score)
	}
	return scores
}

func (scores Scores) ToMap() (scoreMap ScoreMap) {
	scoreMap = make(ScoreMap)
	for _, score := range scores {
		scoreMap[score.Name] = score
	}
	return scoreMap
}

func (scores Scores) Len() int           { return len(scores) }
func (scores Scores) Swap(i, j int)      { scores[i], scores[j] = scores[j], scores[i] }
func (scores Scores) Less(i, j int) bool { return scores[i].Value() < scores[j].Value() }

func getStages(query string, config *Config) (scores Scores, e error) {

	// fetch the issues
	issues, err := getIssues(query, config)
	if err != nil {
		return scores, err
	}

	// score each stage for each issue
	scoreMap := make(ScoreMap)
	for _, issue := range issues {

		// extract stage dates for this issue
		stageDates := make(map[string]string)
		for _, history := range issue.Changelog.Histories {
			for _, jItem := range history.Items {
				if jItem.Field == "status" {
					name := jItem.ToString
					date := strings.SplitN(history.Created, "T", 2)[0]
					if existing := stageDates[name]; existing == "" || existing > date {
						stageDates[name] = date
					}
				}
			}
		}

		// score the stages
		for n1, d1 := range stageDates {
			score := scoreMap[n1]
			score.Name = n1
			score.Issues++
			for _, d2 := range stageDates {
				if d1 > d2 {
					score.Wins++
				}
			}
			scoreMap[n1] = score
		}
	}

	scores = scoreMap.ToArray()
	sort.Sort(scores)
	return scores, e
}

// returns items resulting from supplied query. Use getQuery() to get the query
func getItems(query string, config *Config) (items []*Item, unusedStages map[string]int, e error) {
	// fetch the issues
	issues, err := getIssues(query, config)
	if err != nil {
		return items, unusedStages, err
	}

	// extract work item info
	unusedStages = make(map[string]int)
	for _, issue := range issues {
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
			creationDate := fields["created"].(string)
			events[0] = append(events[0], creationDate)
		}
		if config.ResolvedInLastStage {
			if (fields["status"] != nil) {
				statusStruct := fields["status"]
				statusName := statusStruct.(map[string]interface{})
				issueStatus := statusName["name"].(string)
				if (issueStatus == "Closed"){
					if (fields["resolutiondate"] != nil) {
						resolutionDate := fields["resolutiondate"].(string)
						doneStageIndex := config.StageMap[strings.ToUpper("CLOSED")]
						events[doneStageIndex] = append(events[doneStageIndex], resolutionDate)
					}
				}
			}
		}
		for _, history := range issue.Changelog.Histories {
			for _, jItem := range history.Items {
				if jItem.Field == "status" {
					stageName := jItem.ToString
					if stageIndex, found := config.StageMap[strings.ToUpper(stageName)]; found {
						date := history.Created
						events[stageIndex] = append(events[stageIndex], date)
					} else {
						count := unusedStages[jItem.ToString]
						unusedStages[stageName] = count + 1
					}
				}
			}
		}

		// backflow occurs when a stage has multiple dates. Note the latest date in the stage,
		// but keep only the earliest date. Then traverse subsequent stages deleting all dates
		// that are on or before that noted latest date.
		latestValidDate := ""
		for stageIndex, stageDates := range events {

			// first filter out dates in this stage that are before latestValidDate
			stageDates = removeDatesBefore(stageDates, latestValidDate)

			// now handle backflow
			if len(stageDates) > 1 {
				sort.Strings(stageDates)                       // from earliest to latest
				latestInStage := stageDates[len(stageDates)-1] // note the latest
				stageDates = stageDates[:1]                    // keep only the earliest

				// traverse subsequent stages, removing dates before latest
				for j := stageIndex + 1; j < len(events); j++ {
					events[j] = removeDatesBefore(events[j], latestInStage)
				}
			}

			// at this point 0 or 1 date remains
			if len(stageDates) > 0 {
				latestValidDate = stageDates[0]
				item.StageDates[stageIndex] = strings.SplitN(latestValidDate, "T", 2)[0]
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
				itemValue := getValue(fields, a.FieldName, a.ContentName)
				if (itemValue == ""){
					itemValue = getValue(fields, a.FieldName, "name")
				}
				item.Attributes[i] = itemValue

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
					item.Attributes[i] = getValue(fields, "fixVersions", "name")
				case "components":
					item.Attributes[i] = getValue(fields, "components", "name")
				}
			}
		}

		items = append(items, item)
	}

	return items, unusedStages, nil
}

// performed in place
func removeDatesBefore(dates []string, date string) []string {
	keepIndex := 0
	for _, d := range dates {
		if d >= date {
			dates[keepIndex] = d
			keepIndex++
		}
	}
	return dates[:keepIndex]
}

func getQuery(startIndex int, batchSize int, config *Config) string {
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
	jql := strings.Join(clauses, " AND ") + " order by key"

	return config.UrlRoot +
		"/search?jql=" + url.QueryEscape(jql) +
		"&startAt=" + strconv.Itoa(startIndex) +
		"&maxResults=" + strconv.Itoa(batchSize) +
		"&expand=changelog"
}

func getProjects(config *Config) (result JiraProjectList, e error) {

	// get credentials
	credentials, err := config.GetCredentials()
	if err != nil {
		return result, err
	}

	// send the request
	client := http.Client{}
	url := config.UrlRoot + "/project"
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+credentials)
	var resp *http.Response
	if resp, err = client.Do(req); err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// process the response
	if resp.StatusCode == 200 { // OK

		if PRINT_JSON {
			var indented bytes.Buffer
			bodyBytes, _ := ioutil.ReadAll(resp.Body)
			json.Indent(&indented, bodyBytes, "", "\t")
			indented.WriteTo(os.Stdout)
		}

		// decode json
		var list JiraProjectList
		json.NewDecoder(resp.Body).Decode(&list)
		result = list

	} else {
		e = fmt.Errorf("Error: %v failed", url)
	}

	return result, e
}

func getWorkflows(config *Config) (result JiraWorkflowList, e error) {

	// get credentials
	credentials, err := config.GetCredentials()
	if err != nil {
		return result, err
	}

	// extract the project
	project := strings.Trim(config.ProjectNames[0], "\"")

	// send the request
	client := http.Client{}
	url := config.UrlRoot + "/project/" + project + "/statuses"
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+credentials)
	var resp *http.Response
	if resp, err = client.Do(req); err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// process the response
	if resp.StatusCode == 200 { // OK

		if PRINT_JSON {
			var indented bytes.Buffer
			bodyBytes, _ := ioutil.ReadAll(resp.Body)
			json.Indent(&indented, bodyBytes, "", "\t")
			indented.WriteTo(os.Stdout)
		}

		// decode json
		var list JiraWorkflowList
		json.NewDecoder(resp.Body).Decode(&list)
		result = list

	} else {
		e = fmt.Errorf("Error: %v failed", url)
	}

	return result, e
}

// returns items resulting from supplied query. Use getQuery() to get the query
func getIssues(query string, config *Config) (result []JiraIssue, e error) {

	// get credentials
	credentials, err := config.GetCredentials()
	if err != nil {
		return result, err
	}

	// send the request
	//client := http.Client{Timeout: time.Duration(10*time.Millisecond)}
	client := http.Client{}
	req, _ := http.NewRequest("GET", query, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+credentials)
	var resp *http.Response
	if resp, err = client.Do(req); err != nil {
		return nil, fmt.Errorf("No such host: %v", err)
	}
	defer resp.Body.Close()

	// process the response
	if resp.StatusCode == 200 { // OK

		if PRINT_JSON {
			var indented bytes.Buffer
			bodyBytes, _ := ioutil.ReadAll(resp.Body)
			json.Indent(&indented, bodyBytes, "", "\t")
			indented.WriteTo(os.Stdout)
		}

		// decode json
		var list JiraIssueList
		json.NewDecoder(resp.Body).Decode(&list)
		result = list.Issues

	} else {
		name := ""
		info := ""
		switch resp.StatusCode {
		case 400:
			name = "400 (Bad Request)"
			info = "Possible causes:\n" +
				" - A project doesn't exist\n" +
				" - A filter doesn't exist\n" +
				" - Nested comma, quote, or backslash"
		case 401:
			name = "401 (Not Authorized)"
			info = "Possible causes:\n" +
				" - Incorrect username or password\n" +
				" - Your server doesn't support basic authentication\n" +
				" - You are trying to use OAuth"
		case 404:
			name = "404 (Not Found)"
			info = "Perhaps your Jira instance is configured differently?"
		}
		e = fmt.Errorf("Response Status Code %s\n%s\nQuery: %s\n", name, info, query)
	}

	return result, e
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

func cleanString(s string) string {
	s = strings.Replace(s, "\"", "", -1) // remove quotes
	s = strings.Replace(s, "'", "", -1)  // remove quotes
	s = strings.Replace(s, ",", "", -1)  // remove commas
	s = strings.Replace(s, "\\", "", -1) // remove backslashes
	return strings.TrimSpace(s)
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
	buffer.WriteString("," + cleanString(item.Name))
	for _, stageDate := range item.StageDates {
		buffer.WriteString("," + stageDate)
	}
	if len(config.Types) > 1 {
		buffer.WriteString("," + item.Type)
	}
	for _, value := range item.Attributes {
		buffer.WriteString("," + cleanString(value))
	}
	return buffer.String()
}

func (item *Item) toJSON(config *Config, writeLink bool) string {
	var data []string
	data = append(data, strings.TrimSpace(item.Id))
	if writeLink {
		data = append(data, config.Domain+"/browse/"+item.Id)
	} else {
		data = append(data, "")
	}
	data = append(data, strings.TrimSpace(item.Name))
	for _, stageDate := range item.StageDates {
		data = append(data, stageDate)
	}
	if len(config.Types) > 1 {
		data = append(data, strings.TrimSpace(item.Type))
	}
	for _, value := range item.Attributes {
		data = append(data, strings.TrimSpace(value))
	}
	result, _ := json.Marshal(data)
	return string(result)
}
