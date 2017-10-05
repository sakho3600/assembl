import React from 'react';
import go from 'gojs';

let myDiagram;
const data = {
  class: 'go.TreeModel',
  nodeDataArray: [
    { key: 0, text: 'Mind Map', loc: '0 0' },
    { key: 1, parent: 0, text: 'Getting more time', brush: 'skyblue', dir: 'right', loc: '77 -22' },
    { key: 11, parent: 1, text: 'Wake up early', brush: 'skyblue', dir: 'right', loc: '200 -48' },
    { key: 12, parent: 1, text: 'Delegate', brush: 'skyblue', dir: 'right', loc: '200 -22' },
    { key: 13, parent: 1, text: 'Simplify', brush: 'skyblue', dir: 'right', loc: '200 4' },
    { key: 2, parent: 0, text: 'More effective use', brush: 'darkseagreen', dir: 'right', loc: '77 43' },
    { key: 21, parent: 2, text: 'Planning', brush: 'darkseagreen', dir: 'right', loc: '203 30' },
    { key: 211, parent: 21, text: 'Priorities', brush: 'darkseagreen', dir: 'right', loc: '274 17' },
    { key: 212, parent: 21, text: 'Ways to focus', brush: 'darkseagreen', dir: 'right', loc: '274 43' },
    { key: 22, parent: 2, text: 'Goals', brush: 'darkseagreen', dir: 'right', loc: '203 56' },
    { key: 3, parent: 0, text: 'Time wasting', brush: 'palevioletred', dir: 'left', loc: '-20 -31.75' },
    { key: 31, parent: 3, text: 'Too many meetings', brush: 'palevioletred', dir: 'left', loc: '-117 -64.25' },
    { key: 32, parent: 3, text: 'Too much time spent on details', brush: 'palevioletred', dir: 'left', loc: '-117 -25.25' },
    { key: 33, parent: 3, text: 'Message fatigue', brush: 'palevioletred', dir: 'left', loc: '-117 0.75' },
    { key: 331, parent: 31, text: 'Check messages less', brush: 'palevioletred', dir: 'left', loc: '-251 -77.25' },
    { key: 332, parent: 31, text: 'Message filters', brush: 'palevioletred', dir: 'left', loc: '-251 -51.25' },
    { key: 4, parent: 0, text: 'Key issues', brush: 'coral', dir: 'left', loc: '-20 52.75' },
    { key: 41, parent: 4, text: 'Methods', brush: 'coral', dir: 'left', loc: '-103 26.75' },
    { key: 42, parent: 4, text: 'Deadlines', brush: 'coral', dir: 'left', loc: '-103 52.75' },
    { key: 43, parent: 4, text: 'Checkpoints', brush: 'coral', dir: 'left', loc: '-103 78.75' }
  ]
};
class MindMap extends React.Component {
  constructor(props) {
    super(props);
    this.layoutTree = this.layoutTree.bind(this);
    this.addNodeAndLink = this.addNodeAndLink.bind(this);
  }
  componentDidMount() {
    const $ = go.GraphObject.make;
    myDiagram = $(go.Diagram, 'myDiagramDiv', {
      'commandHandler.copiesTree': true,
      'commandHandler.deletesTree': true,
      'draggingTool.dragsTree': true,
      initialContentAlignment: go.Spot.Center,
      'undoManager.isEnabled': true
    });
    myDiagram.nodeTemplate = $(
      go.Node,
      'Vertical',
      { selectionObjectName: 'TEXT' },
      $(
        go.TextBlock,
        {
          name: 'TEXT',
          minSize: new go.Size(30, 15),
          editable: true
        },
        new go.Binding('text', 'text').makeTwoWay(),
        new go.Binding('scale', 'scale').makeTwoWay(),
        new go.Binding('font', 'font').makeTwoWay()
      ),
      $(
        go.Shape,
        'LineH',
        {
          stretch: go.GraphObject.Horizontal,
          strokeWidth: 3,
          height: 3,
          portId: '',
          fromSpot: go.Spot.LeftRightSides,
          toSpot: go.Spot.LeftRightSides
        },
        new go.Binding('stroke', 'brush'),
        new go.Binding('fromSpot', 'dir', (d) => {
          return this.spotConverter(d, true);
        }),
        new go.Binding('toSpot', 'dir', (d) => {
          return this.spotConverter(d, false);
        })
      ),
      new go.Binding('location', 'loc', go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding('locationSpot', 'dir', (d) => {
        return this.spotConverter(d, false);
      })
    );
    myDiagram.nodeTemplate.selectionAdornmentTemplate = $(
      go.Adornment,
      'Spot',
      $(
        go.Panel,
        'Auto',
        $(go.Shape, { fill: null, stroke: 'dodgerblue', strokeWidth: 3 }),
        $(go.Placeholder, { margin: new go.Margin(4, 4, 0, 4) })
      ),
      $(
        'Button',
        {
          alignment: go.Spot.Right,
          alignmentFocus: go.Spot.Left,
          click: this.addNodeAndLink
        },
        $(go.TextBlock, '+', { font: 'bold 8pt sans-serif' })
      )
    );
    myDiagram.nodeTemplate.contextMenu = $(
      go.Adornment,
      'Vertical',
      $('ContextMenuButton', $(go.TextBlock, 'Layout'), {
        click: function (e, obj) {
          const adorn = obj.part;
          adorn.diagram.startTransaction('Subtree Layout');
          this.layoutTree(adorn.adornedPart);
          adorn.diagram.commitTransaction('Subtree Layout');
        }
      })
    );
    myDiagram.linkTemplate = $(
      go.Link,
      {
        curve: go.Link.Bezier,
        fromShortLength: -2,
        toShortLength: -2,
        selectable: false
      },
      $(
        go.Shape,
        { strokeWidth: 3 },
        new go.Binding('stroke', 'toNode', (n) => {
          if (n.data.brush) return n.data.brush;
          return 'black';
        }).ofObject()
      )
    );
    myDiagram.addDiagramListener('SelectionMoved', () => {
      const rootX = myDiagram.findNodeForKey(0).location.x;
      myDiagram.selection.each((node) => {
        if (node.data.parent !== 0) return; // Only consider nodes connected to the root
        const nodeX = node.location.x;
        if (rootX < nodeX && node.data.dir !== 'right') {
          this.updateNodeDirection(node, 'right');
        } else if (rootX > nodeX && node.data.dir !== 'left') {
          this.updateNodeDirection(node, 'left');
        }
        this.layoutTree(node);
      });
    });
    this.load();
  }
  spotConverter(dir, from) {
    if (dir === 'left') {
      return from ? go.Spot.Left : go.Spot.Right;
    }
    return from ? go.Spot.Right : go.Spot.Left;
  }
  addNodeAndLink(e, obj) {
    const adorn = obj.part;
    const diagram = adorn.diagram;
    diagram.startTransaction('Add Node');
    const oldnode = adorn.adornedPart;
    const olddata = oldnode.data;
    const newdata = { text: 'idea', brush: olddata.brush, dir: olddata.dir, parent: olddata.key };
    diagram.model.addNodeData(newdata);
    this.layoutTree(oldnode);
    diagram.commitTransaction('Add Node');
  }
  layoutTree(node) {
    if (node.data.key === 0) {
      this.layoutAll();
    } else {
      const parts = node.findTreeParts();
      this.layoutAngle(parts, node.data.dir === 'left' ? 180 : 0);
    }
  }
  layoutAngle(parts, angle) {
    const layout = go.GraphObject.make(go.TreeLayout, {
      angle: angle,
      arrangement: go.TreeLayout.ArrangementFixedRoots,
      nodeSpacing: 5,
      layerSpacing: 20,
      setsPortSpot: false,
      setsChildPortSpot: false
    });
    layout.doLayout(parts);
  }

  layoutAll() {
    const root = myDiagram.findNodeForKey(0);
    if (root === null) return;
    myDiagram.startTransaction('Layout');
    const rightward = new go.Set(go.Part);
    const leftward = new go.Set(go.Part);
    root.findLinksConnected().each((link) => {
      const child = link.toNode;
      if (child.data.dir === 'left') {
        leftward.add(root);
        leftward.add(link);
        leftward.addAll(child.findTreeParts());
      } else {
        rightward.add(root);
        rightward.add(link);
        rightward.addAll(child.findTreeParts());
      }
    });
    this.layoutAngle(rightward, 0);
    this.layoutAngle(leftward, 180);
    myDiagram.commitTransaction('Layout');
  }
  save() {
    myDiagram.model = data;
    myDiagram.model.toJson();
    myDiagram.isModified = false;
  }
  load() {
    myDiagram.model = go.Model.fromJson(data);
  }
  render() {
    return <div id="myDiagramDiv" style={{ border: 'solid 1px black', width: '100%', height: '300px' }} />;
  }
}

export default MindMap;