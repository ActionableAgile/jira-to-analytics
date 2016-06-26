# ActionableAgile Analytics Tool

The Analytics Tool is an isomorphic analytics extraction tool written in [Typescript].

## Installation
Analytics tool requires [Node.js](https://nodejs.org/) v4+ to run.

Run the following commands to install the tool and the required dependencies:
```sh
$ git clone [git-repo-url] analytics-tool
$ cd analytics-tool/typescript
$ npm install
```

## Extracting
To extract from JIRA, run ```npm start```

##### Configurable settings

```-i``` specifies input config file name (defaults to config.yaml)

```-o``` specifies output file name (must end with .csv or .json, defaults to data.csv)


For example, to run the tool with a config file named myconfig.yaml and exporting data to  mydata.csv:

```npm start -i myconfig.yaml -o my.csv``` 



### Version 
0.1.0

### Tech

The Agile tool uses a number of open source projects to work properly:
* [node.js] - evented asynchronous I/O for the backend
* [typescript] - typed superset of typescript
* [Express] - fast node.js network app framework
* [Mocha] - Flexible JavaScript testing framework

And of course the Agile tool itself is open source with a [public repository][repo]
 on GitHub.


### Todos

 - Write Tests
 - Add JSON support
 - Add more extractor sources

License
----
MIT


[//]: # (These are reference links used in the body of this note and get stripped out when the markdown processor does its job. There is no need to format nicely because it shouldn't be seen. Thanks SO - http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)
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
