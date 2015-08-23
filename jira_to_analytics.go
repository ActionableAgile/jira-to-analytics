// Method:
// 1. Parse command-line flags and config file
// 2. Fetch Jira Issue Keys in batches
// 3. Fetch Jira Issues by key in batches, using them to build work items
// 4. Write out CSV, one work item per line

package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"
)

const version = "1.0-beta.5"
const keyBatchSize = 500
const issueBatchSize = 100
const maxTries = 5
const retryDelay = 5 // seconds per retry

func main() {
	start := time.Now()

	// parse command-line args
	yamlName := flag.String("i", "config.yaml", "set the input config file name")
	csvName := flag.String("o", "data.csv", "set the output CSV file name")
	printVersion := flag.Bool("v", false, "print the version number and exit")
	showJQL := flag.Bool("j", false, "display the jql used")
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

	// load config and set password
	fmt.Println("Reading config file", *yamlName)
	config, err := LoadConfigFromFile(*yamlName)
	if err != nil {
		fmt.Println("Error:", err)
		os.Exit(0)
	}
	if len(config.Password) == 0 {
		config.Password = getPassword()
	}

	// collect all the keys
	fmt.Println("Fetching issue keys...")
	var keys, keyBatch []string
	var jql string
	maxKey := ""
	for keyBatch, jql, err = getKeys(keyBatchSize, maxKey, config); err == nil && len(keyBatch) > 0; keyBatch, _, err = getKeys(keyBatchSize, maxKey, config) {
		keys = append(keys, keyBatch...)
		maxKey = keyBatch[len(keyBatch)-1]
		if len(maxKey) == 0 { // first time only
			if *showJQL {
				fmt.Println("JQL:", jql)
			}
			fmt.Println("\tLoaded", len(keyBatch), "keys")
		} else {
			fmt.Println("\tLoaded", len(keyBatch), "keys,", len(keys), "total")
		}
	}

	// collect the work items for the keys
	fmt.Println("Fetching issues...")
	var items []*Item
	for i := 0; i < len(keys); i += issueBatchSize {
		end := i + issueBatchSize
		if end >= len(keys) {
			end = len(keys)
		}
		success := false
		fmt.Print("\tLoading Issues ", i+1, "-", end, ": ")
		for tries := 0; tries < maxTries; i++ {
			if itemBatch, err := getItems(keys[i:end], config); err == nil {
				items = append(items, itemBatch...)
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
			os.Exit(1)
		}
	}

	// output work items
	fmt.Println("Writing", *csvName)
	writeCSV(items, config, *csvName)

	// show elapsed time
	elapsed := time.Since(start)
	fmt.Printf("Total Time: %s\n", elapsed)
}

func writeCSV(items []*Item, config *Config, fileName string) {

	// open the file
	file, err := os.Create(fileName)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	// write the header line
	file.WriteString("ID,Link,Name")
	for _, stage := range config.StageNames {
		file.WriteString("," + stage)
	}
	if len(config.Types) > 0 {
		file.WriteString(",Type")
	}
	for _, attr := range config.Attributes {
		file.WriteString("," + attr.ColumnName)
	}
	file.WriteString("\n")

	// write a line for each work item
	writeLink := true
	counter := 0
	for _, item := range items {
		if item.HasDate() {
			file.WriteString(item.String(config, writeLink))
			file.WriteString("\n")
			writeLink = false
			counter++
		}
	}

	// display some stats
	skipped := len(items) - counter
	if skipped > 0 {
		fmt.Println(skipped, "empty work items omitted")
	}
	fmt.Println(counter, "work items written")
}
