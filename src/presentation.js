// Import React
import React from 'react';

import {find,some,map,flatMap,head} from 'lodash';

import * as md5 from 'md5-hex'

// Import Spectacle Core tags
import {
  BlockQuote,
  Cite,
  Deck,
  Heading,
  ListItem,
  List,
  Quote,
  Slide,
  Text,
  Table,
  TableBody,
  TableRow,
  TableItem,
  S,
  Code
} from 'spectacle';

// Import theme
import createTheme from 'spectacle/lib/themes/default';

import { useQuery } from '@apollo/react-hooks';
import { gql } from "apollo-boost";

import { Cypher } from "graph-app-kit/components/Cypher";
import { AsciiTable } from "graph-app-kit/components/AsciiTable";

// Require CSS
require('normalize.css');

// Cypher helpers...
const formatRecords = records => {
  let out = [[...records[0].keys]];
  records.forEach(record => {
    out.push(record._fields);
  });
  return out;
};

const queryResultView = ({ pending, error, result }) => {
  return pending ? (
    <div style={{ height: "60px" }}>pending</div>
  ) : error ? (
    <div style={{ height: "60px" }}>{error.message}</div>
  ) : result ? (
    <AsciiTable data={formatRecords(result.records)} />
  ) : null;
};

const WORKSPACE_PROJECTS = gql`
  {
    workspace {
      projects {
        name
        id
      }
    }
  }
`
function WorkspaceProjects() {
  const { loading, error, data } = useQuery(WORKSPACE_PROJECTS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  return (
  <List>
    {data.workspace.projects.map(({ name, id }) => (
    <ListItem key={id}>{name}</ListItem>
  ))}
  </List>
  );
}

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
function ActiveGraph() {
  const { loading, error, data } = useQuery(ACTIVE_GRAPH);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  const activeGraph = head(flatMap(data.workspace.projects, (p) => p.graphs))
  console.log(activeGraph)

  return (
    <Table>
      <TableBody>
        <TableRow>
          <TableItem>Name</TableItem>
          <TableItem>{activeGraph.name}</TableItem>
        </TableRow>
        <TableRow>
          <TableItem>Status</TableItem>
          <TableItem>{activeGraph.status}</TableItem>
        </TableRow>
        <TableRow>
          <TableItem>Connection</TableItem>
          <TableItem>{activeGraph.connection.principals.protocols.bolt.url}</TableItem>
        </TableRow>
        <TableRow>
          <TableItem>username/password</TableItem>
          <TableItem>{activeGraph.connection.principals.protocols.bolt.username} /
            <S type="strikethrough">{md5(activeGraph.connection.principals.protocols.bolt.password).slice(0,8)}</S>
          </TableItem>
        </TableRow>
      </TableBody>
    </Table>
  )
}

const theme = createTheme(
  {
    primary: 'white',
    secondary: 'steelblue',
    tertiary: 'seagreen',
    quaternary: 'DarkSlateGray',
  },
  {
    primary: 'Montserrat',
    secondary: 'Helvetica',
  }
);

export default class Presentation extends React.Component {
  render() {
    return (
      <Deck
        transition={['zoom', 'slide']}
        transitionDuration={500}
        theme={theme}
      >
        <Slide transition={['zoom']} bgColor="primary">
          <Heading size={1} fit caps lineHeight={1} textColor="secondary">
            Spectacle of Neo4j Desktop
          </Heading>
          <Text margin="10px 0 0" textColor="tertiary" size={2} fit bold>
            querying with GraphQL and bolt
          </Text>
        </Slide>
        <Slide transition={['fade']} bgColor="secondary" textColor="darkgray">
          <Heading size={6} textColor="primary" caps>
            Workspace Projects
          </Heading>
          <WorkspaceProjects />
        </Slide>
        <Slide transition={['fade']} bgColor="primary" textColor="tertiary">
          <Heading size={6} textColor="secondary" caps>
            Active Graph
          </Heading>
          <ActiveGraph />
        </Slide>
        <Slide transition={['fade']} bgColor="secondary" textColor="primary">
          <Heading size={6} textColor="primary" caps>
            Node Count
          </Heading>
          <Code>MATCH (n) RETURN count(n) AS count</Code>
          <Cypher
            query='MATCH (n) RETURN count(n) AS count'
            render={queryResultView}
            />
        </Slide>
        <Slide transition={['fade']} bgColor="secondary" textColor="primary">
          <Heading size={6} textColor="primary" caps>
            Node Labels
          </Heading>
          <Code>MATCH (n) RETURN count(n) AS count</Code>
          <Cypher
            query='CALL db.labels() YIELD label WITH label RETURN collect(label) as labels'
            render={queryResultView}
            />
        </Slide>
      </Deck>
    );
  }
}
