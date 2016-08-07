const toCSV = (workItems: IWorkItem[], stages: string[], attributes: {}, withHeader: boolean = true): string => {
  const header = `ID,Link,Name,${stages.join(',')},Type,${Object.keys(attributes).join(',')}`;
  const body = workItems.map(item => item.toCSV()).reduce((res, cur) => `${res + cur}\n`, '');
  const csv: string = `${header}\n${body}`;
  return csv;
};

const toSerializedArray = (workItems: IWorkItem[], stages: string[], attributes: {}, withHeader: boolean = true): string => {
  const header = `["ID","Link","Name",${stages.map(stage => `"${stage}"`).join(',')},"Type",${Object.keys(attributes).map(attribute => `"${attribute}"`).join(',')}]`;
  const body = workItems.map(item => item.toSerializedArray()).reduce((res, cur) => `${res},\n${cur}`, '');
  const serializedData: string = `[${header}${body}]`;
  return serializedData;
};

export {
  toCSV, 
  toSerializedArray,
}