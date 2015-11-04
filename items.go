package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"
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
			creationDate := strings.SplitN(fields["created"].(string), "T", 2)[0]
			events[0] = append(events[0], creationDate)
		}
		for _, history := range issue.Changelog.Histories {
			for _, jItem := range history.Items {
				if jItem.Field == "status" {
					stageName := jItem.ToString
					if stageIndex, found := config.StageMap[strings.ToUpper(stageName)]; found {
						date := strings.SplitN(history.Created, "T", 2)[0]
						events[stageIndex] = append(events[stageIndex], date)
					} else {
						count := unusedStages[jItem.ToString]
						unusedStages[stageName] = count + 1
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
				case "fixVersion":
					item.Attributes[i] = getValue(fields, "fixVersion", "")
				case "components":
					item.Attributes[i] = getValue(fields, "components", "")
				}
			}
		}

		items = append(items, item)
	}

	return items, unusedStages, nil
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
		"?jql=" + url.QueryEscape(jql) +
		"&startAt=" + strconv.Itoa(startIndex) +
		"&maxResults=" + strconv.Itoa(batchSize) +
		"&expand=changelog"
}

// returns items resulting from supplied query. Use getQuery() to get the query
func getIssues(query string, config *Config) (result []JiraIssue, e error) {

	// get credentials
	credentials, err := config.GetCredentials()
	if err != nil {
		return result, err
	}

	// send the request
	client := http.Client{Timeout: time.Duration(60 * time.Second)}
	req, _ := http.NewRequest("GET", query, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic "+credentials)
	var resp *http.Response
	if resp, err = client.Do(req); err != nil {
		return nil, fmt.Errorf("Couldn't connect to %s\n"+
			"Possible causes:\n"+
			" - Misspelled domain\n"+
			" - No network connection\n",
			config.Domain)
	}
	defer resp.Body.Close()

	// process the response
	if resp.StatusCode == 200 { // OK

		if PRINT_JSON {
			bodyBytes, _ := ioutil.ReadAll(resp.Body)
			bodyString := string(bodyBytes)
			fmt.Println(bodyString)
			return result, e
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
	for _, value := range item.Attributes {
		data = append(data, strings.TrimSpace(value))
	}
	result, _ := json.Marshal(data)
	return string(result)
}
