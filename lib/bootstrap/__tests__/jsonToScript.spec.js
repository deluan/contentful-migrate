const expect = require('expect.js');
const {
  removeNullValues,
  rejectEmptyObjects,
  createChangeEditorInterface,
  restructureFields,
  restructureContentTypeJson,
  jsonToScript
} = require('../jsonToScript');

const TIME_OUT = 5000; // in milliseconds

const assertProps = (actualProps, expected) => {
  Object.keys(actualProps).forEach((prop) => {
    expect(actualProps[prop]).to.be(expected[prop]);
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
    expect(prunedObject).to.eql(expectedPruned);
  });

  it('should do nothing if value is a string or number or array of either', () => {
    const values = [5, '5', Array(5).fill(5), Array(5).fill('5')];
    values.forEach(value => expect(removeNullValues(value)).to.eql(value));
  });

  it('should do nothing if object does not contain any nulls', () => {
    expect(removeNullValues(expectedPruned)).to.eql(expectedPruned);
  });

  it('should do return null if value is null', () => {
    expect(removeNullValues(null)).to.eql(null);
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
    expect(actual.length).to.be(3);
    actual.forEach((pair, index) => {
      expect(pair).to.eql(keyValuePair[index]);
    });
  });
});

describe('createChangeEditorInterface', () => {
  it('creates changeEditorInterface without settings', () => {
    const itemId = 'myModel';
    const field = { fieldId: 'unicornDestroyer', widgetId: 'number' };

    const changeEditorInterface = createChangeEditorInterface(itemId, field);
    const expected = 'myModel.changeEditorInterface("unicornDestroyer", "number");';
    expect(changeEditorInterface).to.equal(expected);
  });

  it('creates changeEditorInterface with settings', () => {
    const itemId = 'myModel';
    const field = {
      fieldId: 'pegasusLauncher',
      widgetId: 'radio',
      settings: { parts: 'button' }
    };
    const changeEditorInterface = createChangeEditorInterface(itemId, field);
    const expected = 'myModel.changeEditorInterface("pegasusLauncher", "radio", {"parts":"button"});';
    expect(changeEditorInterface).to.equal(expected);
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
    expect(actual.id).to.be(field.id);
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
    expect(actual.id).to.be(contentType.sys.id);
  });

  it('moves name, displayField, description into props', () => {
    assertProps(actual.props, contentType);
  });

  it('maps each field into id and props', () => {
    actual.fields.forEach((field, index) => {
      const expected = contentType.fields[index];
      expect(field.id).to.be(expected.id);
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

  const editorInterface = [
    { fieldId: 'unicornDestroyer', widgetId: 'number' },
    {
      fieldId: 'pegasusLauncher',
      widgetId: 'radio',
      settings: { parts: 'button' }
    }
  ];

  it('generates description, up and down', () => {
    const actual = jsonToScript(contentType, editorInterface);
    expect(actual).to.contain('module.exports.description = \'Create content model for Horse\'');
    expect(actual).to.contain('module.exports.up');
    expect(actual).to.contain('module.exports.down');
  }).timeout(TIME_OUT);
});
