// Import React
import React, { lazy, Component, Suspense } from 'react';

import {concat,find,some,map,flatMap,head,sortBy,groupBy,unionBy,uniqBy,set,merge} from 'lodash';

import {types as neo4jTypes } from 'neo4j-driver/lib/v1';

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

import {
  Box,
  Card,
  Flex
} from 'rebass'

import { importMDX } from 'mdx.macro';

// Import theme
import createTheme from 'spectacle/lib/themes/default';

import { useQuery } from '@apollo/react-hooks';
import { gql } from "apollo-boost";

import { Cypher } from "graph-app-kit/components/Cypher";
import { AsciiTable } from "graph-app-kit/components/AsciiTable";

import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveNetwork } from '@nivo/network'
import { ResponsiveGeoMap } from '@nivo/geo'

import countries from "./data/geo-countries-id.json";
import cities from "./data/cities.json";

const MdxContent = lazy(() => importMDX('./mdx/hello.mdx'));

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

const extractGraphFromPath = (path, acc) => {
  return acc;
}

const extractGraphElements = (obj, acc) => {
  const array = Array.isArray(obj) ? obj : [obj];
  return array.reduce((acc, value) => {
    if (value instanceof neo4jTypes.Node) acc.push(value)
    if (value instanceof neo4jTypes.Relationship) acc.push(value)
    if (value instanceof neo4jTypes.Path) extractGraphFromPath(value, acc);

    // if (value.children) {
    //   acc = acc.concat(flatten(value.children));
    //   delete value.children;
    // }
    return acc;
  }, acc);
}

const extractGraph = (records) => {
  const paths = records.reduce((acc, record) => {
    record._fields.forEach(field => extractGraphElements(field, acc))
    return acc;
  }, [])

  console.log(paths)

  const graph = groupBy(paths, (v) => {
    if (v instanceof neo4jTypes.Node) return 'nodes';
    if (v instanceof neo4jTypes.Relationship) return 'edges';
  })

  graph.nodes = uniqBy(graph.nodes, 'identity').map(n => merge(n, 
    {id:n.identity, 
      "radius": 24,
      "depth": 1,
      "color": "rgb(97, 205, 187)"
    }
    ))
  graph.edges = uniqBy(graph.edges, 'identity').map(e => merge(e, 
    {
      id:e.identity, source:e.start, target:e.end, 
      }
      ))

  console.log(graph)

  // return staticGraph(records)
  return graph;
}

const queryResultView = ({ pending, error, result }) => {
  return pending ? (
    <div style={{ height: "60px" }}>pending</div>
  ) : error ? (
    <div style={{ height: "60px", background:"red"}}>{error.message}</div>
  ) : result ? (
    <AsciiTable data={formatRecords(result.records)} />
  ) : null;
};

const movieTaglineView = ({ pending, error, result }) => {
  if (pending) return (
    <div style={{ height: "60px" }}>pending</div>
  )
  if (error) return  (
    <div style={{ height: "60px", background:"red"}}>{error.message}</div>
  ) 
  
  const movie = result.records[0].get(0);

  return (<BlockQuote>
    <Quote>{movie.properties.tagline}</Quote>
    <Cite>{movie.properties.title}</Cite>
  </BlockQuote>
  )
};


const listFromColumnZero = ({ pending, error, result }) => {
  if (pending) return (
    <div style={{ height: "60px" }}>pending</div>
  )
  if (error) return  (
    <div style={{ height: "60px", background:"red"}}>{error.message}</div>
  ) 
  
  return result.records.map( (r,i) => (
    <ListItem key={i}>
      {r.get(0)}
    </ListItem>
    )
  )
};

const barChart = ({ pending, error, result }) => {
  if (pending) return (
    <div style={{ height: "60px" }}>pending</div>
  )
  if (error) return  (
    <div style={{ height: "60px", background:"red"}}>{error.message}</div>
  ) 
  
  const data = sortBy(result.records.map( r => r.toObject()),(r => r.id));

  return (
    <Box width='60vw' height='50vh'>
    <ResponsiveBar
        data={data}
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        colors={{ scheme: 'dark2' }}
        borderColor={{ from: 'color', modifiers: [ [ 'darker', 1.6 ] ] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'age',
            legendPosition: 'middle',
            legendOffset: 32
        }}
        axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'actors',
            legendPosition: 'middle',
            legendOffset: -40
        }}
        animate={true}
        motionStiffness={90}
        motionDamping={15}
        isInteractive={false}
        enableLabel={false}

    />
</Box>
  )
};

const networkChart = ({ pending, error, result }) => {
  if (pending) return (
    <div style={{ height: "60px" }}>pending</div>
  )
  if (error) return  (
    <div style={{ height: "60px", background:"red"}}>{error.message}</div>
  ) 
  
  const graph = extractGraph(result.records);

  return (
    <Box width='60vw' height='80vh'>
      <ResponsiveNetwork
        nodes={graph.nodes}
        links={graph.edges}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        linkDistance={60}
        distanceMin={30}
        repulsivity={480}
        iterations={180}
        nodeColor={function (e){return e.color}}
        nodeBorderWidth={4}
        nodeBorderColor={{ from: 'color', modifiers: [ [ 'darker', 0.8 ] ] }}
        linkThickness={function (e){return 2*(2-e.source.depth)}}
        motionStiffness={160}
        motionDamping={12}
    />

    </Box>

  )
}

const featureColorMap = {
  "Point": {fill:"red", border:"532929"},
  "Polygon": {fill:"#5f7F3f", border:"475F2f"},
  "MultiPolygon": {fill:"#5f7F3f", border:"475F2f"}
}
const geoFillColor = (e) => {
  return featureColorMap[e.geometry.type].fill
}

const geoBorderColor = (e) => {
  return featureColorMap[e.geometry.type].border
}

const worldChart = ({ pending, error, result }) => {
  if (pending) return (
    <div style={{ height: "60px" }}>pending</div>
  )
  if (error) return  (
    <div style={{ height: "60px", background:"red"}}>{error.message}</div>
  ) 
  
  // const graph = extractGraph(result);

  return (
    <Box width='64vw' height='60vh'>
    <ResponsiveGeoMap
      features={concat(countries, cities.features )}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        projectionType="orthographic"
      projectionScale={500}
      projectionTranslation={[ 0.5, 0.5 ]}
      projectionRotation={[ -18.03, -59.2, 0 ]}
      fillColor={geoFillColor}
      borderWidth={0.5}
      borderColor="#333333"
      enableGraticule={true}
      graticuleLineColor="#666666"
    />
  </Box>)
}

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
    tertiary: 'black',
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
          <Code>CALL db.labels()</Code>
          <Cypher
            query='CALL db.labels() YIELD label WITH label RETURN collect(label) as labels'
            render={queryResultView}
            />
        </Slide>
        <Slide transition={['fade']} bgColor="secondary" textColor="primary">
          <Cypher
            query='MATCH (n) RETURN n limit 1'
            render={movieTaglineView}
            />
        </Slide>
        <Slide transition={['fade']} bgColor="secondary" textColor="primary">
          <Heading size={6} textColor="primary" caps>
            Some Movies from the 90s
          </Heading>
          <List>
          <Cypher
            query='MATCH (nineties:Movie) WHERE nineties.released >= 1990 AND nineties.released < 2000 RETURN nineties.title LIMIT 10'
            render={listFromColumnZero}
            />
            </List>
        </Slide>
        <Slide transition={['fade']} bgColor="primary" textColor="secondary">
          <Heading size={6} textColor="secondary" caps>
            Actor Age Distribution
          </Heading>

          <Cypher
            query='MATCH (actor:Person) WHERE exists(actor.born) RETURN ((2020 - actor.born) / 10) * 10 as id, count(actor) as value, collect(actor.name) as detail'
            render={barChart}
            />
        </Slide>

        <Slide transition={['fade']} bgColor="primary" textColor="secondary">
          <Heading size={6} textColor="secondary" caps>
            Tom's World
          </Heading>

          <Cypher
            query='MATCH p=(actor:Person {name:"Tom Hanks"})-->(:Movie)<-[:ACTED_IN]-(:Person) RETURN nodes(p), relationships(p)'
            render={networkChart}
            />
        </Slide>


        <Slide transition={['fade']} bgColor="primary" textColor="secondary">
          <Heading size={6} textColor="secondary" caps>
            Movie Locations
          </Heading>

          <Cypher
            query='MATCH (movies:Movie) RETURN movies'
            render={worldChart}
            />
        </Slide>

        <Slide>
          <Suspense fallback={<div>Loading...</div>}>
            <MdxContent />
          </Suspense>
        </Slide>
      </Deck>
    );
  }
}
