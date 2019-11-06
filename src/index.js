

import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import Redbox from 'redbox-react';

import Presentation from './presentation';

import ApolloClient from 'apollo-boost';
import { ApolloProvider, useQuery } from '@apollo/react-hooks';
import { gql } from "apollo-boost";

import { DriverProvider } from "graph-app-kit/components/DriverProvider";
import neo4j from 'neo4j-driver'

import {flatMap,head} from 'lodash';

const url = new URL(window.location.href);
const apiEndpoint = url.searchParams.get('neo4jDesktopApiUrl');
const apiClientId = url.searchParams.get('neo4jDesktopGraphAppClientId');

const client = new ApolloClient({
  uri: apiEndpoint || 'http://localhost:11001',
  request: (operation) => {
    const token = localStorage.getItem('token')
    operation.setContext({
      headers: {
        'ClientId': apiClientId
      }
    })
  }

});

// set up bolt connection

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'marwhompa'),
  { disableLosslessIntegers: true }
)

const CustomErrorReporter = ({ error }) => <Redbox error={error} />;

CustomErrorReporter.propTypes = {
  error: PropTypes.instanceOf(Error).isRequired,
};


const ACTIVE_GRAPH = gql`
  {
    workspace {
      projects {
        graphs {
          name
          status
          connection {
            principals {
              protocols {
                bolt {
                  username
                  password
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`
function GraphAppProvider({children}) {
  const { loading, error, data } = useQuery(ACTIVE_GRAPH);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  const activeGraph = head(flatMap(data.workspace.projects, (p) => p.graphs))

  return (
    <DriverProvider driver={driver}>
      {children}
    </DriverProvider>
  )
}

ReactDOM.render(
  <AppContainer errorReporter={CustomErrorReporter}>
      <ApolloProvider client={client}>
        <GraphAppProvider><Presentation /></GraphAppProvider>
      </ApolloProvider>
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./presentation', () => {
    const NextPresentation = require('./presentation').default;
    ReactDOM.render(
      <AppContainer errorReporter={CustomErrorReporter}>
          <ApolloProvider client={client}>
            <GraphAppProvider><NextPresentation /></GraphAppProvider>
          </ApolloProvider>
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
