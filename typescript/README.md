

# README #
 


# ActionableAgile Analytics Tool

## Overview ##
The purpose of this software is to extract flow data from Jira and put that data into a proper format for use with the ActionableAgile&trade; Analytics tool (for more information on the ActionableAgile&trade; Analytics tool, please visit [https://www.actionableagile.com](https://www.actionableagile.com) or sign up for a free trial of the tool at [https://www.actionableagile.com/cms/analytics-free-trial-signup.html](https://www.actionableagile.com/cms/analytics-free-trial-signup.html).)  

This program reads in a well-formed config file (see The Config File section below), connects to Jira and extracts data using the Jira REST API according to the parameters specified in the config file (see the Extraction Procedure Section below), and writes out a CSV file or JSON file that can be directly loaded into ActionableAgile&trade; Analytics (see The Output File section below).  



## Installation
>NOTE: Analytics tool requires [Node.js](https://nodejs.org/) v4+ to run. 
If you don't have Node installed, please install it before continuing. 

Download jira_to_analytics.js and config.yaml from the releases page on github (https://github.com/actionableagile/jira-to-analytics/releases) and put both files in the same directory. Which directory you choose doesn’t matter as long as they are co-located. Edit the config file and customize it for your specific Jira instance according to the instructions in the previous README. Open a command prompt and run it by simply typing ```node jira-to-analytics``` (no additional command line parameters are needed). If the program succeeds, the output data file will be written in the same directory as the javascript file
.
## Using the Application

There are two options for running this app:

1. You an run it as a standalone executable using the "jira-to-analytics.exe" file; or,
2. Run it as a node app using the "jira-to-analytics.js" file (e.g., ```node jira-to-analytics```)

> NOTE: There has been an update to the YAML file format. Please see the [config.yaml][config-yaml] file to see an example of the new schema. For those that wish to continue to use the old version of the schema, please enable the legacy flag (```--legacy```). 
##### Configurable settings/flags
These flags are the same whether you are using the standalone executable or node form of the extraction tool.

```-i``` specifies input config file name (defaults to config.yaml)

```-o``` specifies output file name (must end with .csv or .json, defaults to data.csv)

```-l``` or ```--legacy``` will enable the old version of the YAML (from the GO version of the application). 

```--leankit``` will switch the extract source to LeanKit.

```--leankit --setup``` will start a smart wizard to generate the LeanKit configuation file




For example, to run the tool with a legacy config file named myconfig.yaml and exporting data to  mydata.csv:

```node jira-to-analytics -i myconfig.yaml -l -o my.csv``` 



##Config File##
In order for this utility to run properly, you must create a config file that contains the parameters of your Jira instance, and the necessary details of your workflow.  The config file is what tells the executuable what Jira instance to connect to, what data to grab, and how to format the resultant file to be uploaded into the ActionableAgile Analytics tool.

The config file we use conforms to the YAML format standard (http://yaml.org/spec/) and is completely case sensitive.  You can find an example config file here: [https://github.com/ActionableAgile/jira-to-analytics/blob/master/typescript/config.yaml](https://github.com/ActionableAgile/jira-to-analytics/blob/master/typescript/config.yaml).  Feel free to follow along with that example as we run through the details of each section of the file.

The file itself is broken up into the four sections:  

Connection  
Criteria  
Workflow  
Attributes  

### The Connection Section ###
The Connection Section of the config file is simply named "Connection" (without the quotes).  Each line of the this section contains the name of a connection property followed by a colon (:) followed by the required value.  This section has two required fields:

- 	Domain: the url to the domain where your Jira instance is hosted
- 	Username: the username you use to login to Jira

And one optional field:

- 	Password: the password you use to login to Jira

An example of what this section might look like is:

```
Connection:  
	Domain: https://www.myjiradomain.com  
	Username: MyUsername  
	Password: MyPassword  
```

#### OAuth Support
OAuth is now supported. You must get the access token and access token secret on your own by completing the OAuth authorization. 

This application's OAuth configutation requires five inputs:
Domain, Consumer Key, Private Key, Token, and Token Secret:  
**Domain**: The url to the domain where your Jira instance is hosted  
**Consumer Key**: This is the user-specified application key inside JIRA  
**Private Key**: Your private key for the JIRA OAuth  
**Token**: OAuth Access Token  
**Token Secret**: OAuth Access Token Secret

```
Connection:
    Domain: https://myjiradomain.com
    Consumer Key: applicationkey
    Private Key: |
        -----BEGIN RSA PRIVATE KEY-----
        SWbWRCwrXhDH3JLDpiOdsW1pp6jkaUHxyIydU5c4Hx0cYm4hSrpuOkR+QqUbnRgA
        MIICXQIBAAKBgQDL7BKtMeBJJfafe0enaTZi1IlMyTMxWutaYVZ0LPf4TKvOqEr4
        pbmeofMt+/4ddyRQMj91AkBXFGD/me5Fp1R0glMPVE/KnSHo5eAL9n9506n6I4V/
        jtSDHyFMkwkKvjikGgvaXJ5kjwjKweS/XYdwrq6E+sik
        -----END RSA PRIVATE KEY-----
    Token: z9zRCS3o93AiacvbnVSGwI1HkFJbAzLU
    Token Secret: 2pRmA3X85GFvRgZEtOkOEM0uWP3GOTHC
````

### The Criteria Section ###
The Criteria Section of the config file is simply named "Criteria" (without the quotes) and contains optional Jira attributes that can use to control your data set. Each line in this section contains the name of the Jira attribute you want in your data followed by a colon (:) followed by its corresponding value in your Jira instance.  The fields in this section that we support are:

- 	Projects: a list of the names of the Jira Projects you are querying
- 	Types: a list of the names of the Jira issuetypes you want to extract
- 	Filters: a list of the names of the filters you want to apply
- 	Start Date: a date filter in the format YYYY-MM-DD which will exclude issues with resolved dates before the provided date (optional)
- 	End Date: a date filter in the format YYYY-MM-DD which will include issues with resolved dates before the provided date (optional)

An example of what this section might look like would be:

```
Criteria:  
	Project: 
		- My Project1
		- My Project2  
	Filters: 
		- Filter1
		- Filter2
	Issue types: 
		- Epic
		- User Story
	Start Date: 2001-01-23
	End Date: 2019-12-30
	    
```

**NOTE**:  The fields in this section are optional

### The Workflow Section ###
The Workflow Section of the config file is simply named "Workflow" (without the quotes) and contains all the information needed to configure your workflow data.  Each line of the this section contains the name of the workflow column as you want it to appear in the data file, followed by a colon (:) followed by a comma-separated list of all the Jira statuses that you want to map to that column.  For example, a row in your Workflow section that looks like:

Dev: Development Active, Development Done, Staging

will tell the software to look for the Jira statuses "Development Active", "Development Done", and "Staging" and map those statuses to a column in the output data file called "Dev".  The simplest form of this section is to have a one-to-one mapping of all Jira statuses to a corresponding column name in the data file.  For example, assume your Jira workflow is ToDo, Doing, Done.  Then a simple Workflow section of the config file that produces a data file that captures each of those statuses in a respectively named column would be:

```
Workflow:  
	ToDo: ToDo  
	Doing: Doing  
	Done: Done
```

Sometimes Jira issues are created with a certain status, and there is no event that corresponds to a move into that status, so there is no date at which the work item entered the corresponding workflow stage. You can designate that an item be created in a certain workflow stage by adding (Created) to the list of Jira statuses. For example, in the previous example if you wanted to designate that items enter the ToDo workflow stage when they are created, you would change the workflow section of the config file as follows:

```
Workflow:  
	ToDo:
		- ToDo 
		- (Created)  
	Doing: 
		- Doing  
	Done: 
		- Done
```

Again, please refer to the sample config file for an example of what the workflow section looks like. 

**NOTE**:  The Workflow section requires a minimum of TWO (2) workflow steps, and the names of the workflow steps must be specified in the order you want them to appear in the output CSV.  The expectation is that all Jira issue types that are requested will follow the exact same workflow steps in the exact same order.


### The Attributes Section ###
The Attributes Section of the config file is simply named "Attributes" (without the quotes) and is another optional section that includes name-value pairs that you want included in your extracted data set. They may be Jira custom fields that are unique to your Jira instance, or certain standard Jira fields that we support. Each line in this section contains the name you want to appear as the attribute column name in the CSV file, followed by a colon, followed by the name of a Jira custom field or a supported standard field, like this:

- 	CSV Column Name: ID of the custom field 
- 	CSV Column Name: Supported field name



If the returned JSON contains an array, the content of each element is extracted normally. If there are multiple non-empty values, all the values are joined with an escaped comma and surrounded by square brackets like this: [red\,green\,blue]

Here are the standard Jira fields that you can use:  
-  status
-  issuetype
-  priority
-  resolution
-  project
-  labels
-  fixVersions
-  components

An example of what this section might look like is:

```
Attributes:  
	Team: customfield_10000  
	Regulatory Requirement: customfield_10001  
	Status: status  
	Type: issuetype  
	Level: priority  
```

These fields will show up as filter attributes in the generated data file (please visit [https://www.actionableagile.com/format-data-file/](https://www.actionableagile.com/format-data-file/) for more information).

**NOTE**:  None of the fields in this section is required--in fact, this section as a whole is optional.

### LeanKit Automatic Configuration

Run the tool with the --leankit and --setup flags

Example ``` node analytics.js --leankit --setup ```

This will begin a smart wizard. Answer the prompted questions and the configuration will be automatically created for you. The generated config file will be named ```config.yaml```


## Extraction Procedure ##
The program will read in the properly formatted config file (see The Config File section above) and attempt to connect to Jira using the url and authentication parameters specified.  When a connection is established, the software will extract data using Jira’s REST API according to the parameters specified in the config file.  REST calls are “batched” so as to stay under Jira’s “maxResult” size limit as well as to minimize the chances of server timeout errors when retrieving large datasets.  If a non-fatal error is encountered, the extraction program will retry up to five time before terminating.  The program ignores any Jira issue types that have workflow stages not specified in the config and it handles Jira issues that have moved backward and forward through the workflow.
If all goes well, the extraction program will write out a CSV or JSON file that contains all extracted data to the same directory where the program is running.

## Output File ##
The output file follows the format required by the ActionableAgile Analytics tool as specified here:  [https://www.actionableagile.com/format-data-file/](https://www.actionableagile.com/format-data-file/). 

If the output file is a CSV file, it can be loaded directly into the ActionableAgile Analytics tool from the Home tab using the Load Data button.



### Version 
1.1.1 



### Todos

 - Write Tests
 - Add support for attributes with dot notation
 - Add JSON support
 - Add more extractor sources

License
----
MIT


[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)
   [config-yaml]: <https://github.com/ActionableAgile/jira-to-analytics/blob/master/typescript/config.yaml>
   [mocha]: <https://mochajs.org/>
   [typescript]: <https://www.typescriptlang.org>
   [repo]: <https://github.com/ActionableAgile/jira-to-analytics/>
   [git-repo-url]: <https://github.com/ActionableAgile/jira-to-analytics.git>
   [node.js]: <http://nodejs.org>
