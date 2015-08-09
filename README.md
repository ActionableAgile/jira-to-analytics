
## README ##

### OVERVIEW ###
The purpose of this program is to extract flow data from Jira for use with the ActionableAgile Analytics tool.  This program reads in a config file, connects to Jira and extracts data using the Jira REST API according to the parameters specified in the config file, and writes out a CSV file that can be directly loaded into ActionableAgile Analytics.  For more information on the ActionableAgile Analytics tool, please visit [https://www.actionableagile.com](https://www.actionableagile.com) or sign up for a free trial of the tool at [https://www.actionableagile.com/cms/analytics-free-trial-signup.html](https://www.actionableagile.com/cms/analytics-free-trial-signup.html).

This software is written in Go and has been complied into executables for use with these Operating Systems:  Windows, Linux, Mac OS.

###THE CONFIG FILE###
The config file conforms to the YAML format standard (http://yaml.org/spec/).  The file itself is broken up into the following required fields:

- 	Domain (url to the domain where your Jira instance is hosted)
- 	Username (the username you use to login to Jira)
- 	Password (the password you use to login to Jira)
- 	Project (the name of the Jira Project you are querying)
- 	Workflow (the names of the workflow steps specified in the order you want them to appear in the output CSV.  The expectation is that all Jira issues types that are requested will follow the exact same workflow steps in the exact same order.)
- 	Filename (the name of the output CSV file)

And optional fields:

- 	Types (the names of the Jira issuetypes you want to extract)
- 	Custom (the field name and location of any custom fields you use.  Each custom field should be on its own line underneath the “Custom” heading—see the example config file for more detail)

**NOTE**:  We only support Basic Authentication with Jira at this time

### EXTRACTION PROCEDURE ###
The program will read in the config file and attempt to connect to Jira using the url and authentication parameters specified.  When a connection is established, the software will extract data using Jira’s REST API according to the parameters specified in the config file.  REST calls are “batched” so as to stay under Jira’s “maxResult” size limit as well as to minimize the chances of server timeout errors when retrieving large datasets.  If a non-fatal error is encountered, the extraction program will retry up to five time before terminating.  The program ignores any Jira issue types that have workflow stages not specified in the config and it handles jira issues that have moved backward and forward through the workflow.  If all goes well, the extraction program will write out a CSV file that contains all extracted data to the same directory where the program is running.  That CSV can then be loaded directly into the ActionableAgile Analytics tool.

### THE OUTPUT FILE ###
The output CSV file follows the format as specified here:  [https://www.actionableagile.com/format-data-file/](https://www.actionableagile.com/format-data-file/). 

### INFO FOR WINDOWS USERS ###
Download jira_to_analytics.win64.exe and config.yaml from the releases page on github ([https://github.com/actionableagile/jira-to-analytics/releases](https://github.com/actionableagile/jira-to-analytics/releases)) and put both files in the same directory.  Which directory you choose doesn’t matter as long as they are co-located.  You can either launch the exe by double clicking it in an explorer view or open a command prompt and run it from there.  If running from a command prompt simply type the name of the exe in and hit enter (no additional command line parameters are needed).  After the exe quits, a CSV data file with the name specified in your config file will appear in the same directory as the exe.  Take this file and load it into the ActionableAgile Analytics tool.

### INFO FOR LINUX USERS ###
Download jira_to_analytics.linux64 and config.yaml from the releases page on github ([https://github.com/actionableagile/jira-to-analytics/releases](https://github.com/actionableagile/jira-to-analytics/releases)) and put both files in the same directory.  Which directory you choose doesn’t matter as long as they are co-located.  Open a terminal and cd to the directory containing the files. Make the linux64 file executable by typing chmod u+x jira_to_analytics.linux64. Run it by typing ./jira_to_analytics.linux64. When the program finishes, a CSV data file with the name specified in your config file will appear in the same directory as the exe.  Take this file and load it into the ActionableAgile Analytics tool.


### INFO FOR MAC USERS ###
TBD...
