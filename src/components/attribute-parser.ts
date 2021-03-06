const parseAttribute = (attribute: any, customProp?: string): string => {
  if (attribute === undefined || attribute == null) {
    return '';
  } else if (typeof attribute === 'string') {
    return attribute;
  } else if (typeof attribute === 'boolean') {
    return attribute.toString();
  } else if (typeof attribute === 'number') {
    return attribute.toString();
  } else {
    // is object...find a field in priority order
    return customProp ? attribute[customProp]
    : attribute['name'] ? attribute['name']
    : attribute['value'] ? attribute['value']
    : '';
  }
};

const parseAttributeArray = (attributeArray: Array<any>): string => {
  let parsedAttributes: string[] = attributeArray.map(attributeArrayElement => parseAttribute(attributeArrayElement));
  if (parsedAttributes.length === 0) {
    return '';
  }
  return parsedAttributes.length === 1 ? parsedAttributes[0] : `[${parsedAttributes.join(';')}]`;
};

const getAttributes = (fields: any, attributesRequested: string[]): { [val: string]: string } => {
  return attributesRequested.reduce((attributesMap, attributeSystemName) => {
    const attributeData: any = fields[attributeSystemName];

    let subAttribute: string = null;
    if (attributeSystemName.startsWith('customfield_') && attributeSystemName.split('.').length > 1) {
      const multipartAttribute: string[] = attributeSystemName.split('.');
      subAttribute = multipartAttribute[1];
    }

    const parsed: string = Array.isArray(attributeData)
      ? parseAttributeArray(attributeData)
      : parseAttribute(attributeData, subAttribute); // subattribute only supported for nonarrays currently

    attributesMap[attributeSystemName] = parsed;
    return attributesMap;
  }, {});
};

export {
  parseAttribute,
  parseAttributeArray,
  getAttributes,
};