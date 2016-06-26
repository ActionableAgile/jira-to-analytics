const getAttributes = (fields, attributesRequested) => {
  const attributeAliases = Object.keys(attributesRequested); // human name alias
  return attributeAliases.reduce((attributesMap, attributeAlias) => {
    // needs to add the customfield_ stuff...
    const attributeSystemName = attributesRequested[attributeAlias];
    const attributeData: any = fields[attributeSystemName];

    const parsed: string = Array.isArray(attributeData)
      ? parseAttributeArray(attributeData)
      : parseAttribute(attributeData);

    attributesMap[attributeSystemName] = parsed;
    return attributesMap;
  }, {});
};

const parseAttribute = (attribute: any): string => {
  if (attribute === undefined || attribute == null) {
    return '';
  } else if (typeof attribute === 'string') {
    return attribute;
  } else if (typeof attribute === 'number') {
    return attribute.toString();
  } else {
    return attribute.name;
  }
};

const parseAttributeArray = (attributeArray: any[]): string => {
  let parsedAttributes: string[] = attributeArray.map(attributeArrayElement => {
    return parseAttribute(attributeArrayElement);
  });
  if (parsedAttributes.length === 0) {
    return ''
  }
  const result = parsedAttributes.length === 1 ? parsedAttributes[0] : `[${parsedAttributes.join(';')}]`;
  return result;
};

export {
  parseAttribute,
  parseAttributeArray,
  getAttributes,
}