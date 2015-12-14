// Method:
// 1. Parse command-line flags and config file
// 2. Fetch Jira Issues in batches, using them to build work items
// 3. Write out CSV or JSON, one work item per line

package main

import (
	"flag"
	"fmt"
	"os"
	"strings"
	"time"
)

const version = "1.0-beta.12"

const batchSize = 25
const maxTries = 5
const retryDelay = 5 // seconds per retry

func main() {
	start := time.Now()

	// parse command-line args
	yamlName := flag.String("i", "config.yaml", "set the input config file name")
	outName := flag.String("o", "data.csv", "set the output file name (.csv or .json)")
	printVersion := flag.Bool("v", false, "print the version number and exit")
	showQuery := flag.Bool("q", false, "display the query used")
	showUnusedStages := flag.Bool("u", false, "display unused stages")
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
	if !strings.HasSuffix(*outName, ".csv") && !strings.HasSuffix(*outName, ".json") {
		fmt.Println("Error: output file name must end with .csv or .json")
		os.Exit(1)
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

	/*
		// get projects
		if projects, err := getProjects(config); err != nil {
			fmt.Println("failed")
			os.Exit(1)
		} else {
			fmt.Println(projects)
			os.Exit(0)
		}
	*/

	/*
		// get workflows
		if workflows, err := getWorkflows(config); err != nil {
			fmt.Println("failed", err)
			os.Exit(1)
		} else {
			for _, w := range workflows {
				fmt.Println(w.Name)
				for _, s := range w.Statuses {
					fmt.Println("\t", s.Name)
				}
			}
			os.Exit(0)
		}
	*/

	// test with a minimal query
	fmt.Print("\tTesting connection: ")
	query := getQuery(0, 1, config)
	if _, _, err := getItems(query, config); err == nil {
		fmt.Println("ok")
	} else {
		fmt.Print("failed\nError: ", err, "\n")
		os.Exit(1)
	}

	// collect the work items in batches until we get none back or an error
	batchStart := 0
	accumulatedUnusedStages := make(map[string]int)
	var items []*Item
	for {
		end := batchStart + batchSize
		fmt.Print("\tLoading Issues ", batchStart+1, "-", end, ": ")

		query := getQuery(batchStart, batchSize, config)
		if *showQuery {
			fmt.Println("\nQuery:", query)
		}

		// try each batch multiple times if it fails
		batchOk := false
		done := false
		for tries := 0; tries < maxTries; tries++ {
			if itemBatch, unusedStages, err := getItems(query, config); err == nil {

				// accumulate results of batch
				items = append(items, itemBatch...)
				for k, v := range unusedStages {
					accumulatedUnusedStages[k] = accumulatedUnusedStages[k] + v
				}

				fmt.Print("ok (", len(itemBatch), " received)\n")
				if len(itemBatch) == batchSize {
					batchOk = true
				} else {
					done = true
				}
				break
			} else {
				fmt.Print("failed\n\t\tRetrying issues ", batchStart+1, "-", end, ": ")
				time.Sleep(time.Duration(tries*(retryDelay+1)) * time.Second) // delay increases
			}
		}

		if done {
			break
		} else if batchOk {
			batchStart = end
		} else {
			fmt.Println("Error: Issues ", batchStart+1, "-", end, " failed to load")
			os.Exit(1)
		}
	}

	// show unused stages
	if *showUnusedStages && len(accumulatedUnusedStages) > 0 {
		fmt.Println("Unused Jira workflow stages:")
		for k, v := range accumulatedUnusedStages {
			fmt.Print("\t", k, " (", v, " entr")
			if v > 1 {
				fmt.Println("ies)")
			} else {
				fmt.Println("y)")
			}
		}
	}

	// output work items
	fmt.Println("Writing", *outName)
	if strings.HasSuffix(*outName, ".json") {
		writeJSON(items, config, *outName)
	} else {
		writeCSV(items, config, *outName)
	}

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
	for _, attr := range config.Attributes {
		file.WriteString("," + attr.ColumnName)
	}
	file.WriteString("\n")

	// write a line for each work item
	writeLink := true
	counter := 0
	for _, item := range items {
		if item.HasDate() {
			file.WriteString(item.toCSV(config, writeLink))
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

func writeJSON(items []*Item, config *Config, fileName string) {

	// open the file
	file, err := os.Create(fileName)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	// write the header line
	file.WriteString("[[\"ID\",\"Link\",\"Name\"")
	for _, stage := range config.StageNames {
		file.WriteString(",\"" + stage + "\"")
	}
	for _, attr := range config.Attributes {
		file.WriteString(",\"" + attr.ColumnName + "\"")
	}
	file.WriteString("]")

	// write a line for each work item
	writeLink := true
	counter := 0
	for _, item := range items {
		if item.HasDate() {
			file.WriteString(",\n")
			file.WriteString(item.toJSON(config, writeLink))
			writeLink = false
			counter++
		}
	}
	file.WriteString("]\n")

	// display some stats
	skipped := len(items) - counter
	if skipped > 0 {
		fmt.Println(skipped, "empty work items omitted")
	}
	fmt.Println(counter, "work items written")
}
