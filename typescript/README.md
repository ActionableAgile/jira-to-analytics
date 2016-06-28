# ActionableAgile Analytics Tool


## Installation
>NOTE: Analytics tool requires [Node.js](https://nodejs.org/) v4+ to run. 
If you don't have Node installed, please install it before continuing. 

Download jira_to_analytics.js and config.yaml from the releases page on github (https://github.com/actionableagile/jira-to-analytics/releases) and put both files in the same directory. Which directory you choose doesn’t matter as long as they are co-located. Edit the config file and customize it for your specific Jira instance according to the instructions in the previous README. Open a command prompt and run it by simply typing ```node jira-to-analytics``` (no additional command line parameters are needed). If the program succeeds, the output data file will be written in the same directory as the javascript file
.
## Using the Application

To run the JIRA extraction process, run ```node jira-to-analytics```


> NOTE: There has been an update to the YAML file format. Please see the [config.yaml][config-yaml] file to see an example of the new schema. For those that wish to continue to use the old version of the schema, please enable the legacy flag (```--legacy```). 
##### Configurable settings/flags

```-i``` specifies input config file name (defaults to config.yaml)

```-o``` specifies output file name (must end with .csv or .json, defaults to data.csv)

```--legacy``` will enable the old version of the YAML (from the GO version of the application). 




For example, to run the tool with a legacy config file named myconfig.yaml and exporting data to  mydata.csv:

```node jira-to-analytics -i myconfig.yaml --legacy -o my.csv``` 



### Version 
0.1.0 



### Todos

 - Write Tests
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
   [john gruber]: <http://daringfireball.net>
   [@thomasfuchs]: <http://twitter.com/thomasfuchs>
   [df1]: <http://daringfireball.net/projects/markdown/>
   [markdown-it]: <https://github.com/markdown-it/markdown-it>
   [Ace Editor]: <http://ace.ajax.org>
   [node.js]: <http://nodejs.org>
   [Twitter Bootstrap]: <http://twitter.github.com/bootstrap/>
   [keymaster.js]: <https://github.com/madrobby/keymaster>
   [jQuery]: <http://jquery.com>
   [@tjholowaychuk]: <http://twitter.com/tjholowaychuk>
   [express]: <http://expressjs.com>
   [AngularJS]: <http://angularjs.org>
   [Gulp]: <http://gulpjs.com>

   [PlDb]: <https://github.com/joemccann/dillinger/tree/master/plugins/dropbox/README.md>
   [PlGh]:  <https://github.com/joemccann/dillinger/tree/master/plugins/github/README.md>
   [PlGd]: <https://github.com/joemccann/dillinger/tree/master/plugins/googledrive/README.md>
   [PlOd]: <https://github.com/joemccann/dillinger/tree/master/plugins/onedrive/README.md>
