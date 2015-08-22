package main

import (
	"bufio"
	"encoding/base64"
	"fmt"
	"os"
	"strings"
)

var sectionKeys = []string{"Connection", "Workflow", "Optional", "Custom"}
var connectionKeys = []string{"Domain", "Username", "Password"}
var optionalKeys = []string{"Types", "Projects", "Filters"}

type Config struct {
	domain             string
	urlRoot            string
	username           string
	password           string
	stageNames         []string
	stageMap           map[string]int
	projectNames       []string
	types              []string
	filters            []string
	customNames        []string
	customFields       []string
	createInFirstStage bool
}

func (c *Config) getCredentials() (credentials string, error *string) {
	if len(c.password) > 0 {
		credentials = base64.StdEncoding.EncodeToString([]byte(c.username + ":" + c.password))
	} else {
		*error = "Missing password"
	}
	return
}

func LoadConfigFromLines(lines []string) (c *Config, error *string) {
	c = &Config{stageMap: make(map[string]int), createInFirstStage: false}

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
						stageIndex := len(c.stageNames)
						c.stageNames = append(c.stageNames, key)
						for _, value := range strings.Split(value, ",") {
							value = strings.TrimSpace(value)
							if strings.ToLower(value) == "(created)" {
								if stageIndex == 0 {
									c.createInFirstStage = true
								} else {
									*error = fmt.Sprint("Unexpected (Created) in non-first stage",
										c.stageNames[stageIndex], "at line", i)
									return
								}
							} else {
								c.stageMap[value] = stageIndex
							}
						}
					case "Custom":
						c.customNames = append(c.customNames, strings.TrimSpace(key))
						c.customFields = append(c.customFields, value)
					case "Connection":
						if isKey(key, connectionKeys) {
							properties[key] = value
						} else {
							*error = fmt.Sprint("Unexpected property", key, "at line", i)
							return
						}
					case "Optional":
						if isKey(key, optionalKeys) {
							properties[key] = value
						} else {
							*error = fmt.Sprint("Unexpected property", key, "at line", i)
							return
						}
					default:
						*error = fmt.Sprint("Can't parse config file at line", i, "(extra indent?)")
						return
					}
				} else { // not indented
					if isKey(key, sectionKeys) {
						section = key
					} else {
						*error = fmt.Sprint("Unexpected Section", key, "at line", i)
						return
					}
				}
			}
		}
	}

	// extract required domain and build url root
	c.domain = properties["Domain"]
	if len(c.domain) == 0 {
		*error = fmt.Sprint("Config file has no property \"Domain\"")
		return
	}
	c.urlRoot = c.domain + "/rest/api/latest/search"

	// extract required username and optional password
	c.username = properties["Username"]
	if len(c.username) == 0 {
		*error = fmt.Sprint("Config file has no property \"Username\"")
		return
	}
	c.password = properties["Password"]

	// collect project names
	if s, ok := properties["Projects"]; ok {
		c.projectNames = parseList(s)
	}

	// extract work item types
	if s, ok := properties["Types"]; ok {
		c.types = parseList(s)
	}

	// extract filters
	if s, ok := properties["Filters"]; ok {
		c.filters = parseList(s)
	}

	return
}

func LoadConfigFromFile(path string) (c *Config, error *string) {

	// open the file
	file, err := os.Open(path)
	defer file.Close()
	if err != nil {
		*error = fmt.Sprint(err.Error())
		return
	}

	// read in the lines
	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if scanner.Err() != nil {
		*error = fmt.Sprint(scanner.Err().Error())
		return
	}

	return LoadConfigFromLines(lines)
}

// extracts items from string, and quotes them
func parseList(commaDelimited string) []string {
	result := strings.Split(commaDelimited, ",")
	for i, s := range result {
		result[i] = "\"" + strings.TrimSpace(s) + "\""
	}
	return result
}

func isKey(key string, validKeys []string) bool {
	for _, k := range validKeys {
		if k == key {
			return true
		}
	}
	return false
}
