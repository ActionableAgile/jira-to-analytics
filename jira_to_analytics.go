// Overview:
// 1. Read config file (must be named "config.yaml" for now)
// 2. Use config file to set properties needed throughout
// 3. Fetch Jira Issue Keys in batches
// 4. Fetch Jira Issues in batches, using them to build Work Items
// 5. Write out CSV, one Work Item per line

package main

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	//"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

var keyBatchSize = 500
var issueBatchSize = 100
var maxTries = 5
var retryDelay = 5 // seconds per retry

// Jira data structures for unmarshalling from JSON
type JiraIssueKeyList struct {
	Total int
    Issues []JiraIssueKey
}

type JiraIssueKey struct {
    Key string
}

type JiraIssueList struct {
	Issues []JiraIssue
}

type JiraIssue struct {
	Key string
	Fields interface{}
	Changelog JiraChangelog
}

type JiraChangelog struct {
	Total int
	Histories []JiraHistory
}

type JiraHistory struct {
	Id string
	Items []JiraItem
	Created string
}

type JiraItem struct {
	Field string
	ToString string
}

// collect work items for writing to file
type WorkItem struct {
	Id string
	StageDates []string
	Name string
	Type string
	Custom []string
}

var workItems = make(map[string]*WorkItem)

// properties derived from config file
var domain string
var urlAPIRoot string
var credentials string
var fileName string
var projectName string
var stages []string
var stageMap = make(map[string]int)
var types []string
var customNames []string
var customFields []string

func main() {
	start := time.Now()

	// read config file and set global variables
	readConfig("config.yaml")

	// collect all the keys
	fmt.Println("Fetching issue keys...")
	var keys []string
	maxKey := ""
	for batch := getKeys(maxKey, maxTries); len(batch) > 0; batch = getKeys(maxKey, maxTries) {
		keys = append(keys, batch...)
		maxKey = batch[len(batch)-1]
		fmt.Println("\tLoaded", len(batch), "keys,", len(keys), "total")
	}

	// collect the data for the keys
	fmt.Println("Fetching issues...")
	for i := 0; i < len(keys); i += issueBatchSize {
		end := i + issueBatchSize
		if end >= len(keys) {
			end = len(keys)
		}
		batch := keys[i:end]
		success := false
		fmt.Print("\tLoading Issues ", i, "-", end-1, ": ")
		for tries := 0; tries < maxTries; i++ {
			if getIssues(batch) {
				fmt.Println("ok")
				success = true
				break
			}
			if tries < maxTries - 1 {
				fmt.Print("\tRetrying issues ", i, "-", end-1, ": ")
				time.Sleep(time.Duration(tries * (retryDelay + 1)) * time.Second) // delay longer each retry
			}
		}
		if !success {
			fmt.Println("Error: Issues", i, "-", end-1, "failed to load")
			return
		}
	}

	// output workItems
	fmt.Println("Writing", fileName)
	writeCSV(fileName)

	// show elapsed time
	elapsed := time.Since(start)
	fmt.Printf("Total Time: %s\n", elapsed)
}

// read config file and set properties
func readConfig(path string) {
	fmt.Println("Reading config file", path)

	// open the file
	file, err := os.Open(path)
	defer file.Close()
	if err != nil {
		fmt.Println("Error: Can't open " + path + ": " + err.Error())
		return
	}

	// read the file
	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if scanner.Err() != nil {
		fmt.Println("Can't read " + path + ": " + scanner.Err().Error())
		return
	}

	// extract the keys
	properties := make(map[string]string)
	for _, line := range lines {
		if strings.HasPrefix(line, "---") {
			// ignore yaml indicator (really should be on first line only)
		} else if line[0] == '#' {
			// skip comments
		} else {
			parts := strings.SplitN(line, ":", 2)
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if len(key) > 0 {
				if strings.HasPrefix(key, "-") { // custom
					customNames = append(customNames, strings.TrimSpace(key[1:]))
					customFields = append(customFields, value)
				} else if len(value) > 0 { // regular
					properties[key] = value;
				}
			}
		}
	}

	projectName = requiredProperty(properties, "Project")
	fileName = requiredProperty(properties, "Filename")

	// build url root
	domain = requiredProperty(properties, "Domain")
	urlAPIRoot = domain + "/rest/api/latest/"

	// build credentials
	username := requiredProperty(properties, "Username")
	password := requiredProperty(properties, "Password")
	credentials = base64.StdEncoding.EncodeToString([]byte(username + ":" + password))

	// build stages
	stages = strings.Split(requiredProperty(properties, "Workflow"), ",")
	for i, s := range stages {
		s = strings.TrimSpace(s)
		stages[i] = s
		stageMap[s] = i
	}

	// extract work item types
	typesString := properties["Types"]
	if len(typesString) > 0 {
		types = strings.Split(typesString, ",")
		for i, t := range types {
			types[i] = "\"" + strings.TrimSpace(t) + "\""
		}
	}
}

func getKeys(prevMaxKey string, retries int) []string {
	var batch []string

	// build jql
	var buffer bytes.Buffer
	buffer.WriteString("project=" + projectName)
	if len(types) > 0 {
		buffer.WriteString(" AND (issuetype in (" + strings.Join(types, ",") + "))")
	}
	if len(prevMaxKey) > 0 {
		buffer.WriteString(" AND key > " + prevMaxKey)
	}
	buffer.WriteString(" order by key")
	jql := buffer.String()

	// build url
	url := fmt.Sprint(urlAPIRoot, "search?jql=", url.QueryEscape(jql), "&fields=key&maxResults=", keyBatchSize)

	// send the request
	client := http.Client{}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic " + credentials)
	resp, _ := client.Do(req)

	// process the response
	if resp != nil {
		if resp.StatusCode == 200 { // OK
			defer resp.Body.Close()
			var items JiraIssueKeyList
			json.NewDecoder(resp.Body).Decode(&items)
			batch = make([]string, len(items.Issues))
			for i, item := range items.Issues {
				batch[i] = item.Key
			}
    	} else {
			fmt.Println("Error: Response Status Code", resp.StatusCode)
			os.Exit(1)
		}
	} else {
		fmt.Println("Error: No response from", domain)
		os.Exit(1)
	}

	return batch
}

// fetch and process Issues, return success
func getIssues(keys []string) bool {
	success := true

	// build jql
	var buffer bytes.Buffer
	buffer.WriteString("key in (")
	buffer.WriteString(keys[0])
	for i := 1; i < len(keys); i++ {
		buffer.WriteString(",")
		buffer.WriteString(keys[i])
	}
	buffer.WriteString(")")
	jql := buffer.String()

	// build url
	url := fmt.Sprint(urlAPIRoot, "search?jql=", url.QueryEscape(jql), "&maxResults=", issueBatchSize, "&expand=changelog")

	// send the request
	client := http.Client{}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Basic " + credentials)
	resp, _ := client.Do(req)

	// process the response
	if resp.StatusCode == 200 { // OK
		defer resp.Body.Close()

		/*
		// print the json
        bodyBytes, _ := ioutil.ReadAll(resp.Body)
        bodyString := string(bodyBytes)
		fmt.Println(bodyString)
		return true
		*/

		// decode json
		var list JiraIssueList
		json.NewDecoder(resp.Body).Decode(&list)

		// make sure we got the right number back
		if len(list.Issues) != len(keys) {
			fmt.Println("Warning: Requested data for", len(keys), "keys but received", len(list.Issues), "issues")
		}

		// extract work item info
		for _, issue := range list.Issues {
			workItem := getWorkItem(issue.Key)
			for _, history := range issue.Changelog.Histories {
				for _, item := range history.Items {
					if item.Field == "status" {
						stageString := item.ToString
						stageIndex, found := stageMap[stageString]
						if found {
							prevDate := workItem.StageDates[stageIndex]
							date := strings.SplitN(history.Created, "T", 2)[0]
							if len(prevDate) == 0 || date < prevDate {
								workItem.StageDates[stageIndex] = date
							}
						} else {
							//fmt.Println("Warning: Stage", stageString, "is not a listed stage")
						}
					}
				}
			}

			// name must not contain characters that cause problems for CSV
			fields := issue.Fields.(map[string]interface{})
			name := fields["summary"].(string)
			name = strings.Replace(name, "\"", "", -1)
			name = strings.Replace(name, ",", "", -1)
			name = strings.Replace(name, "\\", "", -1)
			workItem.Name = "\"" + name + "\""

			// extract work item type
			if len(types) > 0 {
				typeStruct := fields["issuetype"]	// interface{}
				typeName := typeStruct.(map[string]interface{})
				workItem.Type = typeName["name"].(string)
			}

			// extract custom fields
			for k, v := range customFields {
				customStruct := fields[v] // interface{}
				if customStruct != nil {
					customName := customStruct.(map[string]interface{})
					workItem.Custom[k] = customName["value"].(string)
				}
			}
		}
    } else {
		fmt.Println("Error: Response Status Code", resp.StatusCode)
		success = false
	}

	return success
}

// return a WorkItem from the map, creating it if necessary
func getWorkItem(key string) *WorkItem {
	result, found := workItems[key]
	if !found {
		w := new(WorkItem)
		w.Id = key
		w.StageDates = make([]string, len(stageMap))
		w.Custom = make([]string, len(customFields))
		workItems[key] = w
		result = w
	}
	return result
}

func requiredProperty(properties map[string]string, name string) string {
	result := properties[name]
	if len(result) == 0 {
		fmt.Println("Error: Config file has no property \"" + name + "\"")
		os.Exit(1)
	}
	return result
}

func (w *WorkItem) String(writeLink bool) string {
	var buffer bytes.Buffer
	buffer.WriteString(w.Id)
	buffer.WriteString(",")
	if (writeLink) {
		buffer.WriteString(domain + "/browse/" + w.Id)
	}
	buffer.WriteString("," + w.Name)
	for _, stageDate := range w.StageDates {
		buffer.WriteString("," + stageDate)
	}
	if len(types) > 0 {
		buffer.WriteString("," + w.Type)
	}
	for _, value := range w.Custom {
		buffer.WriteString("," + value)
	}
	return buffer.String()
}

func writeCSV(fileName string) {

	// open the file
	file, err := os.Create(fileName)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	// write the header line
	file.WriteString("ID,Link,Name")
	for _, stage := range stages {
		file.WriteString("," + stage)
	}
	if len(types) > 0 {
		file.WriteString(",Type")
	}
	for _, name := range customNames {
		file.WriteString("," + name)
	}
	file.WriteString("\n")

	// write a line for each work item
	writeLink := true
	for _, workItem := range workItems {
		file.WriteString(workItem.String(writeLink))
		file.WriteString("\n")
		writeLink = false
	}

	fmt.Println(len(workItems), "work items written")
}
