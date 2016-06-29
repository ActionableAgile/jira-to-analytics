# README #

## OVERVIEW ##
The purpose of this software is to extract flow data from Jira and put that data into a proper format for use with the ActionableAgile&trade; Analytics tool (for more information on the ActionableAgile&trade; Analytics tool, please visit [https://www.actionableagile.com](https://www.actionableagile.com) or sign up for a free trial of the tool at [https://www.actionableagile.com/cms/analytics-free-trial-signup.html](https://www.actionableagile.com/cms/analytics-free-trial-signup.html).)  

This program reads in a well-formed config file (see The Config File section below), connects to Jira and extracts data using the Jira REST API according to the parameters specified in the config file (see the Extraction Procedure Section below), and writes out a CSV file or JSON file that can be directly loaded into ActionableAgile&trade; Analytics (see The Output File section below).  

## TWO VERSIONS ##
There are two versions of this utility written in two different programming languages: [Go](http://https://golang.org/) and [Typescript](https://www.typescriptlang.org/).  For detailed instructions on how to use the Go version, please see the README at [https://github.com/ActionableAgile/jira-to-analytics/tree/master/go](https://github.com/ActionableAgile/jira-to-analytics/tree/master/go).  For instructions on how to us the Typescript version, please see the README at [https://github.com/ActionableAgile/jira-to-analytics/tree/master/typescript](https://github.com/ActionableAgile/jira-to-analytics/tree/master/typescript).  

## WHICH VERSION SHOULD I USE? ##
The two versions themselves are essentially the same, so which version you use is essentially up to you, but there may be some things to consider when choosing:

**Typescript** - If you familiar with [Node.js](https://nodejs.org/) already have it installed, then you may want to choose this option.  Each release of the Typescript version of the tool includes a "jira-to-analytics.js" file that can be run using Node (again, see [https://github.com/ActionableAgile/jira-to-analytics/tree/master/typescript](https://github.com/ActionableAgile/jira-to-analytics/tree/master/typescript) for more details).  The Typescript version is a little more feature functional than Go, so where possible, this is the version we recommend that you use.

**Go** - If all you want is a simple executable that you can run from the command line and/or if you do not know about Node.js or do not have it installed, then the Go version is the one for you.  Each release of the Go version of the tool includes pre-compiled executables for three of the world's most popular operating systems (OS):  Linux, Mac OS, and Windows.  To use this version, simply download the executable for the OS you are using and follow the instructions provided.  Again, see [https://github.com/ActionableAgile/jira-to-analytics/tree/master/go](https://github.com/ActionableAgile/jira-to-analytics/tree/master/go) for more details.

## ActionableAgile&trade; Analytics ##
Lastly, thank you very much for your interest in ActionableAgile&trade; Analytics.  We would love to hear from you about how we can make each of our products more useful to you.  Either enter a feature request or comment here or contact us via our website at [https://www.actionableagile.com/contact-us/](https://www.actionableagile.com/contact-us/).

Thanks for your support!

The ActionableAgile&trade; Team
