// if strings.HasPrefix(value, "customfield_") {
//   valueParts := strings.SplitN(value, ".", 2)
//   fieldName := valueParts[0]
//   contentName := "value"
//   if len(valueParts) > 1 {
//     contentName = valueParts[1]
//   }
//   attr := ConfigAttr{key, fieldName, contentName}
//   config.Attributes = append(config.Attributes, attr)



const getAttributes = (fields: any, attributesRequested: any) => {
  const attributeAliases = Object.keys(attributesRequested); // human name alias
  return attributeAliases.reduce((attributesMap, attributeAlias) => {
    // needs to add the customfield_ stuff...
    const attributeSystemName: string = attributesRequested[attributeAlias];
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

const parseAttribute = (attribute: any, custom?: string): string => {
  if (attribute === undefined || attribute == null) {
    return '';
  } else if (typeof attribute === 'string') {
    return attribute;
  } else if (typeof attribute === 'number') {
    return attribute.toString();
  } else {
    return custom ? attribute[custom] : attribute['name'];
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