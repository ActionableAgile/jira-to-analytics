interface IJiraSettings {
    Connection: {
        Domain: string,
        Username: string,
        Password: string,
    },
    Criteria: {
        Projects: Array<string>,
        IssueTypes: Array<string>,
        ValidResolutions: Array<string>,
        Filters: Array<string>,
        JQL: Array<string>,
    },
    Workflow: {},
    Attributes: {},
    Stages;
    StageMap;
    ApiUrl;
    CreateInFirstStage;
    ResolvedInLastStage;
};

const convertToArray = (obj: string[] | {}) => {
    if (obj === undefined || obj == null) return [];
    if (typeof obj === 'string') return [obj];
    return obj instanceof Array ? obj : [obj];
};

const convertStringToArray = (s: string) => {
    if (s === undefined || s == null) return [];
    return s.split(',').map(x => x.trim());
}

class JiraSettings implements IJiraSettings {
    Connection;
    Criteria;
    Workflow;
    Attributes;
    Stages;
    StageMap;
    ApiUrl;
    CreateInFirstStage;
    ResolvedInLastStage;
    constructor(settings: any, source: string) {
        switch (source.toUpperCase()) {
            case 'YAML':
                this.Connection = settings.Connection;

                if (settings.legacy) {
                    this.Criteria = {};
                    this.Criteria.Projects = convertStringToArray(settings.Criteria.Projects); // legacy yaml is Projects (with an s)
                    this.Criteria.IssueTypes = convertStringToArray(settings.Criteria.Types); // legacy yaml is Types
                    this.Criteria.ValidResolutions = convertStringToArray(settings.Criteria['Valid resolutions']); // not used in legacy
                    this.Criteria.Filters = convertStringToArray(settings.Criteria.Filters);
                    this.Criteria.JQL = settings.Criteria.JQL;
                } else {
                    this.Criteria = {};
                    this.Criteria.Projects = convertToArray(settings.Criteria.Project); // cur yaml is Project
                    this.Criteria.IssueTypes = convertToArray(settings.Criteria['Issue types']); // cur yaml is Issue types
                    this.Criteria.ValidResolutions = convertToArray(settings.Criteria['Valid resolutions']);
                    this.Criteria.Filters = convertToArray(settings.Criteria.Filters);
                    this.Criteria.JQL = settings.Criteria.JQL;
                }

                if (this.Criteria.JQL) {
                    console.warn('Custom JQL not currently supported');
                }

                if (this.Criteria.ValidResolutions) {
                    console.warn('Valid Resolutions not currently supported');
                }

                const workflow = {};
                if (settings.legacy) {
                    Object.keys(settings.Workflow).forEach(key => {
                        workflow[key] = convertStringToArray(settings.Workflow[key]);
                    });
                    this.Workflow = workflow;
                } else {
                    Object.keys(settings.Workflow).forEach(key => {
                        workflow[key] = convertToArray(settings.Workflow[key]);
                    });
                    this.Workflow = workflow;
                }

                this.Attributes = settings.Attributes;

                // setup others
                const stages = Object.keys(workflow);
                const stageMap = stages.reduce((map, stage, i) => {
                    return workflow[stage].reduce((map, stageAlias) => {
                    return map.set(stageAlias, i);
                    }, map);
                }, new Map<string, number>());

                const createInFirstStage = stageMap.get('(Created)') === 0 ? true : false;
                const resolvedInLastStage = stageMap.get('(Resolved)') === stages.length - 1 ? true : false;
                if (stageMap.get('(Resolved)') && stageMap.get('(Resolved)') != stages.length - 1) {
                    throw new Error('(Resolved) can only by used in last stage');
                }        
                this.CreateInFirstStage = createInFirstStage;
                this.ResolvedInLastStage = resolvedInLastStage;
                this.Stages = stages;
                this.StageMap = stageMap;
                this.ApiUrl = `${settings.Connection.Domain}/rest/api/latest`;

                return;

            default:
                throw new Error(`${source} source not found`);
        }
    }
}

export  {
    IJiraSettings,
    JiraSettings,
}