package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// Jira data structures for unmarshalling from JSON
type JiraIssueKeyList struct {
	Total  int
	Issues []JiraIssueKey
}

type JiraIssueKey struct {
	Key string
}

// fetch up to n keys that are greater than prevMaxKey
func getKeys(n int, prevMaxKey string, config *Config) (keys []string, jql string, err error) {

	// build jql
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
	if len(prevMaxKey) > 0 {
		clauses = append(clauses, "key > "+prevMaxKey)
	}
	jql = strings.Join(clauses, " AND ") + " order by key"

	// build url
	url := fmt.Sprint(config.UrlRoot, "?jql=", url.QueryEscape(jql), "&fields=key&maxResults=", n)

	// get credentials
	credentials, err := config.GetCredentials()
	if err != nil {
		return nil, "", err
	}

	// send the request
	client := http.Client{}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Add("Accept", "application/json")
	req.Header.Add("Authorization", "Basic "+credentials)
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", fmt.Errorf("HTTP GET request failed for %s\n"+
			"Possible causes:\n"+
			" - No network connection\n"+
			" - Misspelled domain\n",
			config.Domain)
	}

	// process the response
	if resp != nil {
		if resp.StatusCode == 200 { // OK
			defer resp.Body.Close()
			var items JiraIssueKeyList
			json.NewDecoder(resp.Body).Decode(&items)
			keys = make([]string, len(items.Issues))
			for i, item := range items.Issues {
				keys[i] = item.Key
			}
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
				info = "Possible causes\n:" +
					" - Incorrect username or password\n" +
					" - Your server doesn't support basic authentication\n" +
					" - You are trying to use OAuth"
			case 404:
				name = "404 (Not Found)"
				info = "Perhaps your domain is mispelled?"
			}
			return nil, "", fmt.Errorf("Response Status Code %s\n%s\nURL: %s\nJQL: %s\n",
				name, info, config.UrlRoot, jql)
		}
	} else {
		return nil, "", fmt.Errorf("No response from %s", config.Domain)
	}

	return keys, jql, nil
}
