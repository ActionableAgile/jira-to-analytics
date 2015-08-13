

# README #
 
## OVERVIEW ##
The purpose of this software is to extract flow data from Jira and put that data into a proper format for use with the ActionableAgile&trade; Analytics tool (for more information on the ActionableAgile&trade; Analytics tool, please visit [https://www.actionableagile.com](https://www.actionableagile.com) or sign up for a free trial of the tool at [https://www.actionableagile.com/cms/analytics-free-trial-signup.html](https://www.actionableagile.com/cms/analytics-free-trial-signup.html).)  

This program reads in a well-fromed config file (see The Config File section below), connects to Jira and extracts data using the Jira REST API according to the parameters specified in the config file (see the Extraction Procedure Section below), and writes out a CSV file that can be directly loaded into ActionableAgile&trade; Analytics (see The Output File section below).  

This software is written in Go and has been complied into executables for use with these Operating Systems:  Windows, Linux, Mac OS.


##THE CONFIG FILE##
The config file conforms to the YAML format standard (http://yaml.org/spec/) and is completely case sensitive.  The file itself is broken up into the four sections:  

Setup  
Workflow  
Optional Attributes  
Custom Attributes  

You can find an example config file here: [https://github.com/ActionableAgile/jira-to-analytics/blob/master/config.yaml](https://github.com/ActionableAgile/jira-to-analytics/blob/master/config.yaml).  Feel free to follow along with that example as we run through the details of each section of the file.

### The Setup Section ###
The Setup Section of the config file is simply named "Setup" (without the quotes).  Each line of the this section contains the name of the setup property followed by a colon (:) followed by the required value.  This section has two required fields:

- 	Domain: the url to the domain where your Jira instance is hosted
- 	Username: the username you use to login to Jira

And two optional fields:

- 	Password: the password you use to login to Jira
- 	Filename: the name of the output CSV file

If you do not supply a password in the config file, the jira-to-analytics executable will prompt you for a password at runtime.  If you do not provide a filename, a default filename of "Data.csv" will be used for the file that captures the extracted data.  You should also know that the extracted data file is always written to the same directory where the executable is running.

An example of what the elements in this section might look like is:

Domain: http:\\\\myjiradomain.com  
Username: MyUsername  
Password: MyPassword  
Filename: file.csv

**NOTE**:  We only support Basic Authentication with Jira at this time

### The Workflow Section ###
The Workflow Section of the config file is simply named "Workflow" (without the quotes) and contains all the information needed to configure your workflow data.  Each line of the this section contains the name of the workflow column as you want it to appear in the data file, follow by a colon (:) followed by a comma separated list of all the Jira statuses that you want to map to you title.  For example, a row in your Workflow section that looks like:

Dev: Development Active, Development Done, Staging

will tell the software to look for the Jira statuses Development Active, Development Done, and Staging and map those statuses to a column in the output data file called Dev.  The simplest form of this section is to have a one-to-one mapping of all Jira statuses to a corresponding column name in the data file.  For example, assume your Jira workflow is Todo, Doing, Done.  Then a simple Workflow section of the config file that produces a data file that captures each of those statuses in a respectively named column would be:

Todo: Todo  
Doing: Doing  
Done: Done

Again, please refer to the sample config file for an example of what the workflow section looks like. 

**NOTE**:  The Workflow section requires a minimum of TWO (2) workflow steps, and the names of the workflow steps must be specified in the order you want them to appear in the output CSV.  The expectation is that all Jira issues types that are requested will follow the exact same workflow steps in the exact same order.

### The Optional Section ###
The Optional Section of the config file is simply named "Optional" (without the quotes) and contains (as its name implies) optional Jira attributes that you may want to use to further refine your data set. Each line in this section contains the name of the Jira attribute you want in your data followed by a colon (:) followed by its corresponding value in your Jira instance.  The fields in this section that we support are:

- 	Projects: a comma separated project list that contains the name(s) of the Jira Project(s) you are querying)
- 	Types: the names of the Jira issuetypes you want to extract

An example of what this section might look like would be:

Project: My Project1, My Project2  
Types: Epic, User Story

**NOTE**:  By definition, none of the fields in this section is required--in fact, this section as a whole is optional.

### The Custom Section ###
The Custom Section of the config file is simply named "Custom" (without the quotes) and  is another optional section that includes name value pairs of custom fields that you may have added to your Jira instance that you want included in your extracted data set.  Each line in this section contains the name you have assigned to your custom field followed by a colon (:) followed by the value of the ID of the custom field in Jira.

- 	Custom Field Name: ID of the custom field.  

Each custom field should be on its own line underneath the “Custom” heading—see the example config file for more detail.  An example of what some lines in this section would look like is:

Team: customfield\_10000  
Regulatory Requirement: customfield\_10001

These custom fields will show up as filter attributes in the generated data file (please visit [https://www.actionableagile.com/format-data-file/](https://www.actionableagile.com/format-data-file/) for more information).

**NOTE**:  By definition, none of the fields in this section is required--in fact, this section as a whole is optional.

## EXTRACTION PROCEDURE ##
The program will read in the properly formatted config file (see The Config File section above) and attempt to connect to Jira using the url and authentication parameters specified (or will prompt you for a password if you did not specify one).  When a connection is established, the software will extract data using Jira’s REST API according to the parameters specified in the config file.  REST calls are “batched” so as to stay under Jira’s “maxResult” size limit as well as to minimize the chances of server timeout errors when retrieving large datasets.  If a non-fatal error is encountered, the extraction program will retry up to five time before terminating.  The program ignores any Jira issue types that have workflow stages not specified in the config and it handles Jira issues that have moved backward and forward through the workflow.  If all goes well, the extraction program will write out a CSV file that contains all extracted data to the same directory where the program is running.  That CSV can then be loaded directly into the ActionableAgile Analytics tool.

## THE OUTPUT FILE ##
The output CSV file follows the format required by the ActionableAgile Analytics tool as specified here:  [https://www.actionableagile.com/format-data-file/](https://www.actionableagile.com/format-data-file/). 

## INFO FOR WINDOWS USERS ##
Download jira\_to\_analytics.win64.exe and config.yaml from the releases page on github ([https://github.com/actionableagile/jira-to-analytics/releases](https://github.com/actionableagile/jira-to-analytics/releases)) and put both files in the same directory.  Which directory you choose doesn’t matter as long as they are co-located.  You can either launch the exe by double clicking it in an explorer view or open a command prompt and run it from there.  If running from a command prompt simply type the name of the exe in and hit enter (no additional command line parameters are needed).  After the exe quits, a CSV data file with the name specified in your config file will appear in the same directory as the exe.  You can now take this file and load it directly into the ActionableAgile Analytics tool.

## INFO FOR LINUX USERS ##
Download jira\_to\_analytics.linux64 and config.yaml from the releases page on github ([https://github.com/actionableagile/jira-to-analytics/releases](https://github.com/actionableagile/jira-to-analytics/releases)) and put both files in the same directory.  Which directory you choose doesn’t matter as long as they are co-located.  Open a terminal and cd to the directory containing the files. Make the linux64 file executable by typing chmod u+x jira\_to\_analytics.linux64. Run it by typing ./jira\_to\_analytics.linux64. When the program finishes, a CSV data file with the name specified in your config file will appear in the same directory as the exe.  You can now take this file and load it directly into the ActionableAgile Analytics tool.

## INFO FOR MAC USERS ##
Download jira\_to\_analytics.mac64 and config.yaml from the releases page on github ([https://github.com/actionableagile/jira-to-analytics/releases](https://github.com/actionableagile/jira-to-analytics/releases)) and put both files in the same directory.  Which directory you choose doesn’t matter as long as they are co-located.  Open a terminal and cd to the directory containing the files. Make the mac64 file executable by typing chmod u+x jira\_to\_analytics.mac64. Run it by typing ./jira\_to\_analytics.mac64. When the program finishes, a CSV data file with the name specified in your config file will appear in the same directory as the exe.  TYou can now take this file and load it directly into the ActionableAgile Analytics tool.
