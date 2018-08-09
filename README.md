# Theia Tree Editor

The Theia Tree Editor integrates [JSON Forms](https://github.com/eclipsesource/jsonforms) with the [Theia IDe](https://github.com/theia-ide/theia).

This component is not meant to be used standalone but instead enables the usage of the `TreeWithDetail` component
of JSONForms within Theia.

## Prerequisites

You’ll need node in version 8:

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash
    nvm install 8

and yarn

    npm install -g yarn

Also make sure your python --version points to a Python 2.x installation. Run the following command in your terminal.

    python --version
    
Additionally, also install yeoman and the theia extension generator for project scaffolding:

    npm install -g yo generator-theia-extension    

## Getting started

In this section we will walk you through the process of creating a very minimalistic extension based 
on the theia tree editor extension. 

First, let's scaffold a basic extension with the theia generator extension:


    mkdir tree-editor-example && cd tree-editor-example 
    yo theia-extension tree-editor-example
    cd tree-editor-example-extension

Let's add the dependency to the the tree editor with yarn:

    # TODO: publish package on NPM 
    yarn add https://github.com/eclipsesource/theia-tree-editor.git#v0.0.1

## schema

Next, we'll add a basic JSON schema which describes the instances we want to work with. 
For this example we'll use the [Array of things example schema]( http://json-schema.org/learn/miscellaneous-examples.html)
from the [JSON Schema examples section](http://json-schema.org/learn/). 

**TODO (this might change)**: Unfortunately, we have to modify the schema a bit in order to allow JSON Forms mapping subschemas. Therefore, we have to 
set `$id` properties for each definition we want to reference from JSON schema. In this case, we'll replace the `$id` of the schema with `#fruitsOrVegetables` 
and we'll also add an additional `$id` to the `veggie` definition with the value of `#veggie`. 
**TODO**: add link to modified schema

We save the modified schema in a file called `schema.json`. 

## configuration 

Next up, we need to set-up a configurationn object which describes a few additional properties of the schema. Let's first have 
a look at the configurations options and their usage. 

For determing the labels that are to be displayed within the master view of the tree renderer, we set up a `labels` object .
The format follows the pattern of a key-value pair, where the key is the `$id` value of sub schema and the value is the label to be shown.
The label value is either a plain string, or an object with a `property` field. In the latter case the given property
will be used to determine the label of the object to be displayed, which allows for dynamic labels. Specifying a `constant` property is the same
as specifying a plain string.

### Labels

```js
export const labels = {
	"#fruitsOrVegetables": {
		constant: "Fruits/Vegetables"
	},
	"#veggie": {
		property: "veggieName"
	}
}
```

In this example, we display a static string for the top node and a dynamic one for the objects that conform to the `veggie` schema.

### Images 

TODO: 

# Model mapping

The `modelMapping` describes how instances can be mapped their corresponding schema. The first property, `attribute` determines which
property should be used for identification purposes while the `mapping` property, maps possible value of the `attribute` property to 
the respective `$id`s of the sub schemas.

```js
// TODO: rename?
export const modelMapping = {
	attribute: 'type',
 	mapping: {
		disk: '#diskDevice',
		diskUUID: '#diskUUID',
		nfs: '#nfs',
		tmpfs: '#tmpfs'	
 	}	
}
```

# Configure tsconfig.json

"jsx": "react"

"exclude": [
	"node_modules",
	"lib"
]

## App - should be renamed

With the configuration in place we can set up the App component, which will only act as a wrapper around JSON Form's `TreeWithDetail` renderer.
The code for the entire component looks as follows:

```js
import * as React from 'react';
import { TreeWithDetailRenderer } from '@jsonforms/material-tree-renderer';
import { connect } from 'react-redux';
import {
  AppProps,
  mapStateToTreeEditorProps
} from 'theia-tree-editor/theia-tree-editor-extension/lib/browser';

class App extends React.Component<AppProps, {}> {

  render() {
    const { filterPredicate, labelProvider, imageProvider, uischema, schema } = this.props;

    return (
      <TreeWithDetailRenderer
        uischema={uischema}
        schema={schema}
        filterPredicate={filterPredicate}
        labelProvider={labelProvider}
        imageProvider={imageProvider}
      />
    );
  }
}

export default connect(mapStateToTreeEditorProps)(App);
```

## Editor 

Now let's use the component. We need to take care of resolving any potential `$refs`, setting up the redux store and bootstraping the application.
The code to do so is given below:

```js
import { injectable } from "inversify";
import { FrontendApplication } from '@theia/core/lib/browser';
const JsonRefs = require('json-refs');
import { defaultProps } from 'recompose';
import { SelectionService, ResourceProvider } from '@theia/core/lib/common';
import { combineReducers, createStore, Store } from 'redux';
import { materialFields, materialRenderers } from '@jsonforms/material-renderers';
import {
  Actions,
  jsonformsReducer,
  RankedTester
} from '@jsonforms/core';
import {
  treeWithDetailReducer,
  findAllContainerProperties,
  setContainerProperties
} from '@jsonforms/material-tree-renderer';
import {
  TreeEditorOpenHandler
} from 'theia-tree-editor/theia-tree-editor-extension/lib/browser';

import schema from './schema';

import {detailSchemata, /*detailSchemata, imageProvider,*/ labels, modelMapping} from './config';
import App from './App';


const imageGetter = (schemaId: string) => 'icon-test';
  // !_.isEmpty(imageProvider) ? `icon ${imageProvider[schemaId]}` : '';

const initStore = async() => {
  const uischema = {
    'type': 'TreeWithDetail',
    'scope': '#'
  };
  const renderers: { tester: RankedTester, renderer: any}[] = materialRenderers;
  const fields: { tester: RankedTester, field: any}[] = materialFields;
  const jsonforms: any = {
    jsonforms: {
      renderers,
      fields,
      treeWithDetail: {
        // imageMapping: imageProvider,
        // labelMapping: labels,
        modelMapping,
        uiSchemata: detailSchemata
      }
    }
  };

  const store: Store<any> = createStore(
    combineReducers({
        jsonforms: jsonformsReducer(
          {
            treeWithDetail: treeWithDetailReducer
          }
        )
      }
    ),
    { ...jsonforms }
  );

  return await JsonRefs.resolveRefs(schema)
    .then(
      resolvedSchema => {
        store.dispatch(Actions.init({}, resolvedSchema.resolved, uischema));

        store.dispatch(setContainerProperties(
          findAllContainerProperties(resolvedSchema.resolved, resolvedSchema.resolved)));

        return store;
      },
      err => {
        console.log(err.stack);
        return {};
      });
};

const App = defaultProps(
  {
    'filterPredicate': filterPredicate,
    'labelProvider': calculateLabel(labels),
    'imageProvider': imageGetter
  }
)(App);

@injectable()
export class MyEditor extends TreeEditorOpenHandler {
  constructor(app: FrontendApplication,
              selectionService: SelectionService,
              resourceProvider: ResourceProvider) {
    super(app, selectionService, resourceProvider, initStore(),
      App
    );
  }
}
```

## Frontend module

In Theia, everything is wired up via dependency injection. Read this [documentation](http://www.theia-ide.org/doc/authoring_extensions)  for more info.
Finally, update the frontend module already generated by theia with two additional bindings.

```js
bind(TreeEditorOpenHandler).to(MyEditor);
bind(OpenHandler).to(MyEditor);
```

That's it, we are good to go!

## Running the extension

1. Run `yarn start` within `browser-app` directory
2. Run `yarn watch` within `browser-app` directory
3. Run `yarn watch` within the directory of your extension

This will cause your extension and the browser-app to be rebuilt upon each 
change you do in the extension and also start a webserver on http://localhost:3000.
Note however, that a refresh is not triggered.a

Within the browser, navigate to the `File Menu`, open an empty JSON file or, alternatively, create one.
Right click JSON file and select `Open With` and your extension should be listed.
