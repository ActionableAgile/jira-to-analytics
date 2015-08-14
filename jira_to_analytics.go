// Method:
// 1. Parse command-line flags and config file
// 2. Fetch Jira Issue Keys in batches
// 3. Fetch Jira Issues by key in batches, using them to build WorkItems
// 4. Write out CSV, one WorkItem per line

package main

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	//"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

const version = "1.0-beta.4"
const keyBatchSize = 500
const issueBatchSize = 100
const maxTries = 5
const retryDelay = 5 // seconds per retry
var sectionKeys = []string{"Connection", "Workflow", "Optional", "Custom"}
var connectionKeys = []string{"Domain", "Username", "Password"}
var optionalKeys = []string{"Types", "Projects", "Filters"}

// Jira data structures for unmarshalling from JSON
type JiraIssueKeyList struct {
	Total  int
	Issues []JiraIssueKey
}

type JiraIssueKey struct {
	Key string
}

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
type WorkItem struct {
	Id         string
	StageDates []string
	Name       string
	Type       string
	Custom     []string
}

var workItems = make(map[string]*WorkItem)

// properties derived from config file
var domain string
var urlRoot string
var credentials string
var stageNames []string
var stageMap = make(map[string]int)
var projectNames []string
var types []string
var filters []string
var customNames []string
var customFields []string

var showJQL bool

func main() {
	start := time.Now()

	// parse command-line args
	yamlName := flag.String("i", "config.yaml", "set the input config file name")
	csvName := flag.String("o", "data.csv", "set the output CSV file name")
	printVersion := flag.Bool("v", false, "print the version number and exit")
	flag.BoolVar(&showJQL, "j", false, "display the jql used")
	flag.Parse()
	if flag.NArg() > 0 {
		fmt.Println("Unexpected argument \"" + flag.Args()[0] + "\"")
		fmt.Println("For help use", os.Args[0], "-h")
		os.Exit(1)
	}
	if *printVersion {
		fmt.Println(version)
		os.Exit(0)
	}
	if !strings.HasSuffix(*csvName, ".csv") {
		*csvName = *csvName + ".csv"
	}

	// read config file and set global variables
	readConfig(*yamlName)

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
			if tries < maxTries-1 {
				fmt.Print("\tRetrying issues ", i, "-", end-1, ": ")
				time.Sleep(time.Duration(tries*(retryDelay+1)) * time.Second) // delay increases
			}
		}
		if !success {
			fmt.Println("Error: Issues", i, "-", end-1, "failed to load")
			return
		}
	}

	// output workItems
	fmt.Println("Writing", *csvName)
	writeCSV(*csvName)

	// show elapsed time
	elapsed := time.Since(start)
	fmt.Printf("Total Time: %s\n", elapsed)
}

// read config file and set properties
func readConfig(path string) {

	// open the file
	file, err := os.Open(path)
	defer file.Close()
	if err != nil {
		fmt.Println("Error:", err.Error())
		os.Exit(1)
	}
	fmt.Println("Reading config file", path)

	// read the file
	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if scanner.Err() != nil {
		fmt.Println("Error:", scanner.Err().Error())
		os.Exit(1)
	}

	// parse the contents
	properties := make(map[string]string) // for all predefined keys (in Connection or Optional)
	section := ""
	for i, line := range lines {
		if strings.HasPrefix(line, "---") { // skip yaml indicator
		} else if strings.HasPrefix(line, "#") { // skip comments
		} else if len(strings.TrimSpace(line)) == 0 { // skip blank lines
		} else {
			parts := strings.SplitN(line, ":", 2)
			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])
			if len(key) > 0 {
				if line[0] == ' ' || line[0] == '\t' { // indented
					switch section {
					case "Workflow":
						stageIndex := len(stageNames)
						stageNames = append(stageNames, key)
						for _, value := range strings.Split(value, ",") {
							stageMap[strings.TrimSpace(value)] = stageIndex
						}
					case "Custom":
						customNames = append(customNames, strings.TrimSpace(key))
						customFields = append(customFields, value)
					case "Connection":
						if isKey(key, connectionKeys) {
							properties[key] = value
						} else {
							fmt.Println("Error: Unexpected Connection property", key, "at line", i)
							os.Exit(1)
						}
					case "Optional":
						if isKey(key, optionalKeys) {
							properties[key] = value
						} else {
							fmt.Println("Error: Unexpected Optional property", key, "at line", i)
							os.Exit(1)
						}
					default:
						fmt.Println("Can't parse config file at line", i, "(extra indentation?)")
					}
				} else { // not indented
					if isKey(key, sectionKeys) {
						section = key
					} else {
						fmt.Println("Error: Unexpected Section", key, "at line", i)
						os.Exit(1)
					}
				}
			}
		}
	}

	// build url root
	domain = requiredProperty(properties, "Domain")
	urlRoot = domain + "/rest/api/latest/search"

	// build credentials
	username := requiredProperty(properties, "Username")
	password, ok := properties["Password"]
	if !ok {
		password = getPassword()
	}
	credentials = base64.StdEncoding.EncodeToString([]byte(username + ":" + password))

	// collect project names
	if s, ok := properties["Projects"]; ok {
		projectNames = parseList(s)
	}

	// extract work item types
	if s, ok := properties["Types"]; ok {
		types = parseList(s)
	}

	// extract filters
	if s, ok := properties["Filters"]; ok {
		filters = parseList(s)
	}
}

func getKeys(prevMaxKey string, retries int) []string {
	var batch []string

	// build jql
	var clauses []string
	if len(projectNames) == 1 {
		clauses = append(clauses, "project=" + projectNames[0])
	} else if len(projectNames) > 1 {
		clauses = append(clauses, "project in (" + strings.Join(projectNames, ",") + ")")
	}
	if len(types) > 0 {
		clauses = append(clauses, "issuetype in (" + strings.Join(types, ",") + ")")
	}
	for _, filter := range filters {
		clauses = append(clauses, "filter=" + filter)
	}
	if len(prevMaxKey) > 0 {
		clauses = append(clauses, "key > " + prevMaxKey)
	}
	jql := strings.Join(clauses, " AND ") + " order by key"
	if showJQL && len(prevMaxKey) == 0 {
		fmt.Println("JQL:", jql)
	}

	// build url
	url := fmt.Sprint(urlRoot, "?jql=", url.QueryEscape(jql), "&fields=key&maxResults=",
		keyBatchSize)

	// send the request
	client := http.Client{}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Add("Accept", "application/json")
	req.Header.Add("Authorization", "Basic "+credentials)
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error: HTTP GET request failed for", domain)
		fmt.Println("Possible causes:")
		fmt.Println(" - No network connection")
		fmt.Println(" - Misspelled domain")
		os.Exit(1)
	}

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
			name := ""
			info := ""
			switch resp.StatusCode {
			case 400:
				name = "(Bad Request)"
				info = "Possible causes:\n" +
					" - A project doesn't exist\n" +
					" - A filter doesn't exist\n" +
					" - Nested comma, quote, or backslash"
			case 401:
				name = "(Not Authorized)"
				info = "Possible causes\n:" +
					" - Incorrect username or password\n" +
					" - Your server doesn't support basic authentication\n" +
					" - You are trying to use OAuth"
			case 404:
				name = "(Not Found)"
				info = "Perhaps your domain is mispelled?"
			}
			fmt.Println("Error: Response Status Code", resp.StatusCode, name)
			fmt.Println(info)
			fmt.Println("URL: ", urlRoot)
			fmt.Println("JQL: ", jql)
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
	url := fmt.Sprint(urlRoot, "?jql=", url.QueryEscape(jql), "&maxResults=", issueBatchSize,
		"&expand=changelog")

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
			return true
		*/

		// decode json
		var list JiraIssueList
		json.NewDecoder(resp.Body).Decode(&list)

		// make sure we got the right number back
		if len(list.Issues) != len(keys) {
			fmt.Println("Warning: Requested data for", len(keys),
				"keys but received", len(list.Issues), "issues")
		}

		// extract work item info
		for _, issue := range list.Issues {
			workItem := getWorkItem(issue.Key)

			// accumulate out-of-order events so we can handle backward flow
			events := make([][]string, len(stageNames))
			for _, history := range issue.Changelog.Histories {
				for _, item := range history.Items {
					if item.Field == "status" {
						stageString := item.ToString
						if stageIndex, found := stageMap[stageString]; found {
							date := strings.SplitN(history.Created, "T", 2)[0]
							events[stageIndex] = append(events[stageIndex], date)
						}
					}
				}
			}

			// for each stage use min date that is >= max date from previous stages
			previousMaxDate := ""
			for stageIndex := range stageNames {
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
					workItem.StageDates[stageIndex] = stageBestDate
				}
				if stageMaxDate != "" && stageMaxDate > previousMaxDate {
					previousMaxDate = stageMaxDate
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
				typeStruct := fields["issuetype"] // interface{}
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
		// it doesn't matter why because we're going to retry
		fmt.Println("Failed")
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
		w.StageDates = make([]string, len(stageNames))
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

// extracts items from string, and quotes them
func parseList(commaDelimited string) []string {
	result := strings.Split(commaDelimited, ",")
	for i, s := range result {
		result[i] = "\"" + strings.TrimSpace(s) + "\""
	}
	return result
}

func (w *WorkItem) HasDate() bool {
	result := false
	for _, date := range w.StageDates {
		if len(date) > 0 {
			result = true
			break
		}
	}
	return result
}

func (w *WorkItem) String(writeLink bool) string {
	var buffer bytes.Buffer
	buffer.WriteString(w.Id)
	buffer.WriteString(",")
	if writeLink {
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

func isKey(key string, validKeys []string) bool {
	for _, k := range validKeys {
		if k == key {
			return true
		}
	}
	return false
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
	for _, stage := range stageNames {
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
	counter := 0
	for _, workItem := range workItems {
		if workItem.HasDate() {
			file.WriteString(workItem.String(writeLink))
			file.WriteString("\n")
			writeLink = false
			counter++
		}
	}

	// display some stats
	skipped := len(workItems) - counter
	if skipped > 0 {
		fmt.Println(skipped, "empty work items omitted")
	}
	fmt.Println(counter, "work items written")
}
