const {
  removeNullValues,
  rejectEmptyObjects,
  restructureFields,
  restructureContentTypeJson,
  jsonToScript
} = require('../jsonToScript');

const assertProps = (actualProps, expected) => {
  Object.keys(actualProps).forEach((prop) => {
    expect(actualProps[prop]).toBe(expected[prop]);
  });
};

describe('removeNullValues', () => {
  const fieldValue = [
    { linkMimetypeGroup: ['image'] },
    {
      assetImageDimensions: {
        width: { min: null, max: 200 },
        height: { min: null, max: 40 }
      }
    }
  ];

  const expectedPruned = [
    { linkMimetypeGroup: ['image'] },
    {
      assetImageDimensions: {
        width: { max: 200 },
        height: { max: 40 }
      }
    }
  ];

  it('removes keys with null values from objects', () => {
    const prunedObject = removeNullValues(fieldValue);
    expect(prunedObject).toEqual(expectedPruned);
  });

  it('should do nothing if value is a string or number or array of either', () => {
    const values = [5, '5', Array(5).fill(5), Array(5).fill('5')];
    values.forEach(value => expect(removeNullValues(value)).toEqual(value));
  });

  it('should do nothing if object does not contain any nulls', () => {
    expect(removeNullValues(expectedPruned)).toEqual(expectedPruned);
  });

  it('should do return null if value is null', () => {
    expect(removeNullValues(null)).toEqual(null);
  });
});

describe('rejectEmptyObjects', () => {
  it('rejects empty arrays, empty objects and falsey values', () => {
    const keyValuePair = [
      ['foo', 'bar'],
      ['horses', ['unicorn, pegasus']],
      ['peru', { animal: 'alpaca' }],
      ['empty array', []],
      ['empty object', {}],
      ['false', false]
    ];
    const actual = keyValuePair.filter(rejectEmptyObjects);
    expect(actual.length).toBe(3);
    actual.forEach((pair, index) => {
      expect(pair).toEqual(keyValuePair[index]);
    });
  });
});

describe('restructureFields', () => {
  it('pushes attribute of fields other than id into the key props', () => {
    const field = {
      id: 'tail',
      length: 4,
      color: 'black',
      quality: 'bushy'
    };
    const actual = restructureFields(field);
    expect(actual.id).toBe(field.id);
    assertProps(actual.props, field);
  });
});

describe('restructureContentTypeJson', () => {
  const contentType = {
    sys: { id: 'horse' },
    name: 'horse',
    displayField: 'name',
    description: 'most awesome 4 legged animal',
    fields: [
      { id: 'unicorn', name: 'charlie' },
      { id: 'pegasus', name: 'twilight sparkle' }
    ]
  };
  const actual = restructureContentTypeJson(contentType);
  it('moves sys.id to id', () => {
    expect(actual.id).toBe(contentType.sys.id);
  });

  it('moves name, displayField, description into props', () => {
    assertProps(actual.props, contentType);
  });

  it('maps each field into id and props', () => {
    actual.fields.forEach((field, index) => {
      const expected = contentType.fields[index];
      expect(field.id).toBe(expected.id);
      assertProps(field.props, expected);
    });
  });
});

describe('jsonToScript', () => {
  const contentType = {
    sys: { id: 'horse' },
    name: 'Horse',
    displayField: 'name',
    description: 'most awesome 4 legged animal',
    fields: [
      { id: 'unicorn', name: 'charlie' },
      { id: 'pegasus', name: 'twilight sparkle' }
    ]
  };

  it('generates description, up and down', () => {
    const actual = jsonToScript(contentType);
    expect(actual).toMatch('module.exports.description = \'Create content model for Horse\'');
    expect(actual).toMatch('module.exports.up');
    expect(actual).toMatch('module.exports.down');
  });
});
