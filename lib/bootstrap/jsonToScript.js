const eslint = require('eslint');

const removeNullValues = (value) => {
  if (value instanceof Array) {
    return value.map(removeNullValues);
  } else if (value instanceof Object) {
    const prunedObject = {};
    Object.keys(value).forEach((key) => {
      if (value[key] === null || value[key] === undefined) return;
      prunedObject[key] = removeNullValues(value[key]);
    });
    return prunedObject;
  }
  return value;
};

const createProp = ([key, value]) => `
  .${key}(${JSON.stringify(removeNullValues(value))})`;

const rejectEmptyObjects = ([, value]) => {
  const emptyArray = value.constructor === Array && value.length === 0;
  const emptyObject = typeof value === 'object' && Object.keys(value).length === 0;
  return value && !emptyArray && !emptyObject;
};

const createField = (itemId, field) => `
  ${itemId}.createField("${field.id}")${''.concat(...Object.entries(field.props).filter(rejectEmptyObjects).map(createProp))};
`;

const createContentType = item => `
  const ${item.id} = migration.createContentType('${item.id}')${''.concat(...Object.entries(item.props).map(createProp))};
  ${''.concat(...item.fields.map(field => createField(item.id, field)))}
`;

const createScript = item => `module.exports.description = "Create content model for ${item.props.name}";

  module.exports.up = (migration) => {${createContentType(item)}};

  module.exports.down = migration => migration.deleteContentType("${item.id}");
`;

const restructureFields = (field) => {
  /* eslint-disable no-undef */
  ({ id, ...props } = field);
  return { id, props };
  /* eslint-enable no-undef */
};

const restructureContentTypeJson = item => ({
  id: item.sys.id,
  props: {
    name: item.name,
    displayField: item.displayField,
    description: item.description
  },
  fields: item.fields.map(restructureFields)
});

const jsonToScript = (contentTypeJson) => {
  const restructuredJson = restructureContentTypeJson(contentTypeJson);
  const unformattedScript = createScript(restructuredJson);
  const engine = new eslint.CLIEngine({ fix: true });
  return engine.executeOnText(unformattedScript).results[0].output;
};

module.exports = {
  removeNullValues,
  rejectEmptyObjects,
  restructureFields,
  restructureContentTypeJson,
  jsonToScript
};
