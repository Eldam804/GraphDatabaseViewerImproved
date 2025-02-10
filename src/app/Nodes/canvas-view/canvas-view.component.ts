import { Component, Input, OnChanges, Output, SimpleChanges, EventEmitter } from '@angular/core';
import { DriverService } from 'src/app/Neo4j/Database/driver.service';
import * as d3 from 'd3';
import { ElementRef, OnInit, ViewChild } from '@angular/core';
import { zoom, zoomIdentity } from 'd3-zoom';
import { forkJoin } from 'rxjs';
import { NodeDetailDialogComponent } from 'src/app/Components/node-detail-dialog/node-detail-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NodeSingleDialogComponent } from 'src/app/Components/node-single-dialog/node-single-dialog.component';
import { Edge, Node } from 'src/app/Models/nodes';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-canvas-view',
  templateUrl: './canvas-view.component.html',
  styleUrls: ['./canvas-view.component.css']
})
export class CanvasViewComponent implements OnChanges, OnInit{
  @ViewChild('svg') svgRef!: ElementRef;
  @ViewChild('graphContainer') graphContainerRef!: ElementRef;  
  public nodes: Array<Node> = [];
  public edges: Array<Edge> = [];
  public originalNodes: Array<Node> = [];
  public originalEdges: Array<Edge> = [];
  private svg: any;
  private zoomBehavior: any;
  private credentialsSubscription!: Subscription;
  private urlSubscription!: Subscription;
  @Input() canvasData: any;
  @Input() nodeData: Array<Node> = [];
  @Input() edgeData: Array<Edge> = [];
  @Input() classicView: Boolean = true;
  @Input() highlightNodesAndEdges: Boolean = false;
  @Input() restartView: Boolean = false;
  @Output() nodeInfo: EventEmitter<any> = new EventEmitter<any>();
  @Output() allNodes: EventEmitter<any> = new EventEmitter<any>();
  @Output() nodeDataDetails: EventEmitter<any> = new EventEmitter<any>();

  constructor(private service: DriverService, public dialog: MatDialog){
    //this.getAllNodes();
    //this.originalNodes = this.nodes;
    //this.originalEdges = this.edges;
  }
  ngOnInit() {
    // Subscribe to the credentials observable
    this.credentialsSubscription = this.service.credentials$.subscribe({
      next: (credentials : any) => {
        console.log('Credentials changed:', credentials);
        // Call your method to fetch nodes here
        setTimeout(() => {
          // Reinitialize the driver with the new credentials
          this.getAllNodes()
          this.originalNodes = this.nodes;
          this.originalEdges = this.edges;
      }, 2000); // 2000 milliseconds delay
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    // Check if canvasData input has changed
    if (changes.restartView && changes.restartView.currentValue === true) {
      console.debug("Restart view triggered");
      this.restartView = false; // Reset the flag
      this.nodes = this.originalNodes;
      this.edges = this.originalEdges;
      console.debug("CLASSIC VIEW: "+this.classicView);
      if(this.classicView){
        this.createGraph();
      }else{
        this.createClusterGraph();
      }
    }
    if(changes.classicView && !changes.classicView.firstChange){
      console.debug("change happend")
      console.debug(this.classicView);
      if(this.classicView){
        console.debug(this.nodes);
        console.debug(this.edges);
        this.createGraph();
      }else{
        console.debug(this.nodes);
        console.debug(this.edges);
        this.createClusterGraph();
      }
    }
    if ((changes.nodeData && !changes.nodeData.firstChange) || (changes.edgeData && !changes.edgeData.firstChange)) {
      this.handleCanvasDataChange();
    }
  }

  displayData(nodeData: any): void{
    const nodeName = nodeData.name;
    const properties = nodeData.properties;
    console.debug(properties);
    const data = {nodeName, properties};
    const dialogRef = this.dialog.open(NodeDetailDialogComponent, {
      data
    });
    dialogRef.afterClosed().subscribe((result: any) => {
      console.log('Modal closes', result);
    })
  }

  displayNodes(nodeData: any): void{
    const nodeQuery = "MATCH(n:" + nodeData.name + ") RETURN n";
    const edgeQuery = "MATCH(:" + nodeData.name  + ")-[r]->(:" + nodeData.name + ") RETURN r";
    let modalNodes: any = [];
    let modalEdges: any = [];
    console.debug(nodeData);
    forkJoin([
      this.service.sendQuery(nodeQuery),
      this.service.sendQuery(edgeQuery)
    ]).subscribe(([nodesData, edgesData]) => {
      nodesData.forEach((nodeData: any) => {
          modalNodes.push({
              id: nodeData._fields[0].identity,
              name: nodeData._fields[0].labels[0],
              properties: nodeData._fields[0].properties 
          });
      });
      edgesData.forEach((edgeData: any) => {
          modalEdges.push({
              source: edgeData._fields[0].start,
              target: edgeData._fields[0].end,
              type: edgeData._fields[0].type
          });
      });
      let modalView = true;
      const nodeName = nodeData.name;
      const data = {modalEdges, modalNodes, modalView, nodeName};
      const dialogRef = this.dialog.open(NodeSingleDialogComponent, {
        data,
        disableClose: true,
      });
      dialogRef.afterClosed().subscribe((result: any) => {
        console.log('Modal closes', result);
      })
    });
  }


  handleCanvasDataChange() {
    console.debug("CANVAS CHANGE:")
    console.debug(this.canvasData);
    this.nodes = [];
    this.edges = [];
    //var data = this.canvasData;
    /*if(this.canvasData && this.canvasData.length == 0) {
      console.debug("GETALLNODES:")
      this.getAllNodes();
    }else{
      data.forEach((er: any) => {
        this.nodes.push({
          id: er._fields[0].identity,
          name: er._fields[0].labels[0],
          properties: er._fields[0].properties
        });
      });
      console.debug("nodes:" + this.nodes);
      console.debug("edges:" + this.edges);
      
    }*/
    console.debug(this.nodeData);
    console.debug(this.edgeData);
    this.nodes = this.nodeData;
    this.edges = this.edgeData;
    if(this.highlightNodesAndEdges){
      this.renderHighlightedGraph(this.nodes, this.edges);
    }else{
      if(this.classicView){
        console.debug(this.nodes);
        console.debug(this.edges);
        this.createGraph();
      }else{
        console.debug(this.nodes);
        console.debug(this.edges);
        this.createClusterGraph();
      }
    }
    
  }
  getNodeCount(nodeName: string){
    var count: number = 0;
    console.debug(nodeName);
    for (let index = 0; index < this.nodes.length; index++) {
      if(this.nodes[index].name == nodeName){
          count++;
      }
    }
    return count;
  }

  getEdgeCount(nodeType: string){
    var count: number = 0;
    console.debug(nodeType);
    for (let index = 0; index < this.edges.length; index++) {
      if(this.edges[index].type == nodeType){
          count++;
      }
    }
    return count;
  }

  getAllNodes(){
    this.nodes = [];
    this.edges = [];
    let allNodesProps: any = [];
    let allEdgesProps: any = [];
    forkJoin([
      this.service.getAllNodes(),
      this.service.getAllEdges()
    ]).subscribe(([nodesData, edgesData]) => {
      nodesData.forEach((nodeData: any) => {
          //@ts-ignore
          if(!allNodesProps.some(e => e.name === nodeData._fields[0].labels[0])){
            allNodesProps.push({
              name: nodeData._fields[0].labels[0],
              properties: nodeData._fields[0].properties
            })
          }
          
          this.nodes.push({
              id: nodeData._fields[0].identity,
              name: nodeData._fields[0].labels[0],
              properties: nodeData._fields[0].properties 
          });
      });
      console.debug(edgesData);
      edgesData.forEach((edgeData: any) => {
          let startNode: any = this.nodes.find(item => item.id === edgeData._fields[0].start)
          let endNode: any = this.nodes.find(item => item.id === edgeData._fields[0].end)
          //@ts-ignore
          if(!allEdgesProps.some(e => e.type === edgeData._fields[0].type && (!allEdgesProps.some(e => e.startId === startNode.id) || !allEdgesProps.some(e => e.endId === endNode.id)))){
            allEdgesProps.push({
              type: edgeData._fields[0].type,
              start: startNode.name,
              end: endNode.name,
              startId: startNode.id,
              endId: endNode.id
            })
          }

          this.edges.push({
              source: edgeData._fields[0].start,
              target: edgeData._fields[0].end,
              type: edgeData._fields[0].type
          });
      });
      this.nodeDataDetails.emit([allNodesProps, allEdgesProps])
      this.allNodes.emit(this.nodes);
      console.debug("ACTUAL EDGES:");
      console.debug(this.edges);
      console.debug("ACTUAL NODES:");
      console.debug(this.nodes);
      console.debug(this.classicView);
      if(this.highlightNodesAndEdges){
        this.renderHighlightedGraph(this.nodes, this.edges);
      }else{
        if(this.classicView){
          this.createGraph();
        }
        else{
          this.createClusterGraph();
        }
      }
  });
  } 
  generateColors(n: number): string[] {
    const palette2: string[] = [
      '#53347e','#5a4090','#624c9f','#6b59ac',
      '#7665b7','#8172c1','#8c7fc9','#998cd0',
      '#a59ad6','#b2a8da','#bfb6de','#ccc4e0',
      '#d9d2e2','#e6e1e2','#f2f0e2','#edf2e4',
      '#dae5e6','#c8d9e8','#b7cce8','#a5bfe8',
      '#93b3e7','#82a6e4','#719ae1','#608ddd',
      '#5081d8','#3f74d2','#2f68cb','#1f5bc2',
      '#0e4fb9','#0042af']
    const palette: string[] = [
        '#53347e', '#a5bfe8', '#624c9f', '#93b3e7', 
        '#6b59ac', '#82a6e4', '#8172c1', '#719ae1', 
        '#998cd0', '#608ddd', '#b2a8da', '#5081d8', 
        '#ccc4e0', '#3f74d2', '#e6e1e2', '#2f68cb', 
        '#f2f0e2', '#1f5bc2', '#edf2e4', '#0e4fb9', 
        '#dae5e6', '#0042af', '#c8d9e8', '#7665b7', 
        '#b7cce8', '#8c7fc9', '#bfb6de', '#5a4090', 
        '#d9d2e2', '#a59ad6'
    ];
  
    const colors: string[] = [];
    for (let i = 0; i < n; i++) {
      colors.push(palette[i % palette.length]);
    }
  
    return colors;
  }

  renderHighlightedGraph(subgraphNodes: Array<Node>, subgraphEdges: Array<Edge>): void {
    const svgWidth = window.innerWidth;
    const svgHeight = window.innerHeight;

    // Extract unique node and edge types for color coding
    const nodeTypes = [...new Set(this.originalNodes.map(node => node.name))];
    const edgeTypes = [...new Set(this.originalEdges.map(edge => edge.type))];
    const allTypes = [...nodeTypes, ...edgeTypes]; // Combine node and edge types
    const colors = this.generateColors(allTypes.length); // Generate colors
    const colorScale = d3.scaleOrdinal(colors).domain(allTypes);

    // Prepare node and edge color mappings
    const nodeTypesWithColors = nodeTypes.map(nodeType => ({
        nodeType: nodeType,
        color: colorScale(nodeType),
        length: this.getNodeCount(nodeType),
    }));
    const edgeTypesWithColors = edgeTypes.map(edgeType => ({
        relType: edgeType,
        color: colorScale(edgeType),
        length: this.getEdgeCount(edgeType),
    }));

    // Emit node and edge types with colors
    this.nodeInfo.emit([nodeTypesWithColors, edgeTypesWithColors]);

    // Helper functions for consistent calculations
    const computeCircleRadius = (attributeCount: number, wordLenght: number) => {
      const baseRadius = 50;
      const additionalRadius = 3;  // Increment for each additional attribute beyond a threshold
      const threshold = 3;  // Base radius corresponds to this number of attributes
      const wordThreshold = 10;
      return baseRadius;
      if (attributeCount <= threshold && wordLenght <= wordThreshold) return baseRadius;
      if(attributeCount >= wordLenght){
        return baseRadius + (attributeCount - threshold) * additionalRadius
      }else{
        return baseRadius + (wordLenght - wordThreshold) * additionalRadius;
      }
      
    };

    const getLongestWordLength = (properties: any) => {
      let longestLength = 0;
  
      for (let key in properties) {
          const keyLength = key.length;
          const valueLength = String(properties[key]).length;
          longestLength = Math.max(longestLength, 
            (keyLength + valueLength));
      }
  
      return longestLength;
    };

    function truncateText(text: any, maxLength: any) {
      return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
    }
    // Set up SVG canvas
    const svg = d3.select(this.svgRef.nativeElement)
        .style('background-color', 'transparent')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    svg.selectAll('.nodes').remove();
    svg.selectAll('.links').remove();

    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // Handle zoom behavior
    const zoomBehavior = d3.zoom()
        .extent([[0, 0], [svgWidth, svgHeight]])
        .scaleExtent([0.1, 30])
        .on('zoom', (event: any) => {
            linkGroup.attr('transform', event.transform);
            nodeGroup.attr('transform', event.transform);
        });

    svg.call(zoomBehavior);

    // Initialize force simulation
    const simulation = d3.forceSimulation(this.originalNodes)
        .force('link', d3.forceLink(this.originalEdges).id((d: any) => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(svgWidth / 2, svgHeight / 2))
        .force('collision', d3.forceCollide().radius((d: any) => {
            const attributeCount = Object.entries(d.properties).length;
            const longestWordLength = getLongestWordLength(d.properties);
            return computeCircleRadius(attributeCount, longestWordLength) + 200; // Added spacing
        }));

    let linkIndex: any = {};
    this.originalEdges.forEach((edge, i) => {
        let ids = [edge.source.id, edge.target.id].sort();
        let id = ids.join("-");
        if (!linkIndex[id]) {
            linkIndex[id] = { total: 0, maxIndex: 0 };
        }
        linkIndex[id].maxIndex++;
        edge.linknum = linkIndex[id].maxIndex;
    });

    // Render edges
    const links = linkGroup.selectAll('path')
        .data(this.originalEdges)
        .enter().append('path')
        .attr('stroke', (d) => colorScale(d.type))
        .attr('fill', 'none')
        .attr('stroke-width', 2);

    // Highlight subgraph edges
    links.filter((d: Edge) => subgraphEdges.some(edge => 
      edge.source === d.source.id && edge.target === d.target.id && edge.type == d.type
  ))
      .attr('stroke', 'orange')
      .attr('stroke-width', 4);

    // Render nodes
    const nodes = nodeGroup.selectAll('.node-group')
        .data(this.originalNodes)
        .enter().append('g')
        .attr('class', 'node-group')
        .on('click', (event, nodeData) => this.displayData(nodeData))
        .on('mouseenter', function () {
            d3.select(this).style('cursor', 'pointer');
        })
        .on('mouseleave', function () {
            d3.select(this).style('cursor', 'default');
        });

    nodes.append('circle')
        .attr('r', (d: any) => {
            const attributeCount = Object.entries(d.properties).length;
            const longestWordLength = getLongestWordLength(d.properties);
            return computeCircleRadius(attributeCount, longestWordLength);
        })
        .attr('fill', (d: any) => colorScale(d.name));

    // Highlight subgraph nodes
    nodes.filter((d: Node) => subgraphNodes.some(node => node.id === d.id))
        .select('circle')
        .attr('stroke', 'orange')
        .attr('stroke-width', 3);

    // Display node attributes
    nodes.each(function (d: any) {
        const node = d3.select(this);
        const attributes = Object.entries(d.properties).slice(0, 3);
        let yPosition = 5;
        const lineHeight = 15;

        attributes.forEach(([key, value], index) => {
            node.append('text')
                .attr('dy', yPosition + (index * lineHeight))
                .attr('dx', 0)
                .attr('lengthAdjust', 'spacingAndGlyphs')
                .style('text-anchor', 'middle')
                //@ts-ignore
                .text(`${truncateText(key, 6)}: ${truncateText(value, 5)}`);
        });
    });

    nodes.append('text')
        .attr('dy', -25)
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text((d: any) => truncateText(d.name, 10));

    // Tooltips
    const tooltip = d3.select(this.graphContainerRef.nativeElement).append("div")
        .attr('class', 'tooltip');

    links.on('mouseenter', function (event, d) {
        tooltip
            .style('opacity', 1)
            .style('left', `${event.pageX}px`)
            .style('top', `${event.pageY}px`)
            .html(`${d.type}`);
    }).on('mouseleave', () => {
        tooltip.style('opacity', 0);
    });

    function linkArc(d: any) {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        const linkInfo = linkIndex[[d.source.id, d.target.id].sort().join("-")];
        const totalLinks = linkInfo.total;
        const linkNumber = d.linknum;
        let offset = (linkNumber - (totalLinks - 1) / 2) * 30;
        if (linkNumber % 2 === 0) offset *= -1;
        let qx = d.source.x + dx / 2 + offset;
        let qy = d.source.y + dy / 2 + offset;
        if (totalLinks === 1) {
            qx = 0;
            qy = 0;
        }
        return `M${d.source.x},${d.source.y}Q${qx},${qy} ${d.target.x},${d.target.y}`;
    }

    simulation.on('tick', () => {
        links.attr('d', linkArc);
        nodes.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    this.svg = svg;
    this.zoomBehavior = zoomBehavior;
}
  
  createGraph() {
    const svgWidth = window.innerWidth;
    const svgHeight = window.innerHeight;


    const nodeTypes = [...new Set(this.nodes.map(node => node.name))];
    const edgeTypes = [...new Set(this.edges.map(edge => edge.type))];

    //this.nodeInfo.emit([nodeTypes, edgeTypes]);

    const allTypes = [...nodeTypes, ...edgeTypes]; // Combine node and edge types.
    const colors = this.generateColors(allTypes.length); // Generate colors for all unique types.

    const colorScale = d3.scaleOrdinal(colors).domain(allTypes);

    //const colorScale = d3.scaleOrdinal(d3.schemeCategory10) // or any other categorical color scheme
      //.domain(nodeTypes);
    //const edgeColorScale = d3.scaleOrdinal(d3.schemeCategory10) // or any other color scheme
    //  .domain(edgeTypes);
    // Select SVG and set dimensions
    let nodeTypesWithColors = nodeTypes.map(nodeType => ({
      nodeType: nodeType,
      color: colorScale(nodeType),
      length: this.getNodeCount(nodeType)
    }));
  
    let edgeTypesWithColors = edgeTypes.map(edgeType => ({
      relType: edgeType,
      color: colorScale(edgeType),
      length: this.getEdgeCount(edgeType)
    }));

  // Emit the combined data (types and colors)
  this.nodeInfo.emit([nodeTypesWithColors, edgeTypesWithColors]);
  
    const svg = d3.select(this.svgRef.nativeElement)
      .style('background-color', 'transparent')
        .attr('width', svgWidth)
        .attr('height', svgHeight);
   
    svg.selectAll('.nodes').remove();
    svg.selectAll('.links').remove();
        

    const constrain = (value: number, min: number, max: number) => {
        return Math.max(min, Math.min(value, max));
    };

    const zoomHandler = (event: any) => {
      const { x, y, k } = event.transform;
      //event.transform.x = constrain(x, -2 * svgWidth, 2 * svgWidth);
      //event.transform.y = constrain(y, -2 * svgHeight, 2 * svgHeight);
      linkGroup.attr('transform', event.transform);
      nodeGroup.attr('transform', event.transform);
  };
  const getLongestWordLength = (properties: any) => {
    let longestLength = 0;

    for (let key in properties) {
        const keyLength = key.length;
        const valueLength = String(properties[key]).length;
        longestLength = Math.max(longestLength, 
          (keyLength + valueLength));
    }

    return longestLength;
  };
  const computeCircleRadius = (attributeCount: number, wordLenght: number) => {
    const baseRadius = 50;
    const additionalRadius = 3;  // Increment for each additional attribute beyond a threshold
    const threshold = 3;  // Base radius corresponds to this number of attributes
    const wordThreshold = 10;
    return baseRadius;
    if (attributeCount <= threshold && wordLenght <= wordThreshold) return baseRadius;
    if(attributeCount >= wordLenght){
      return baseRadius + (attributeCount - threshold) * additionalRadius
    }else{
      return baseRadius + (wordLenght - wordThreshold) * additionalRadius;
    }
    
  };
  
  const zoomBehavior = d3.zoom()
      .extent([[0, 0], [svgWidth,svgHeight]])
      .scaleExtent([0.1, 30])
      .on('zoom', zoomHandler);

    svg.call(zoomBehavior);

    // Random node positions

    const simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.edges).id((d: any) => d.id).distance(100)) // Increased distance
      .force('charge', d3.forceManyBody().strength(-300)) // Increased repulsion
      .force('center', d3.forceCenter(svgWidth / 2, svgHeight / 2))
      .force('collision', d3.forceCollide().radius((d: any) => {
        const attributeCount = Object.entries(d.properties).length;
        const longestWordLength = getLongestWordLength(d.properties);
        return computeCircleRadius(attributeCount, longestWordLength) + 200; // Added some extra spacing
    }));
    let linkIndex: any = {};
    this.edges.forEach((edge, i) => {
      let ids = [edge.source.id, edge.target.id].sort();
      let id = ids.join("-");
      if (!linkIndex[id]) {
        linkIndex[id] = { total: 0, maxIndex: 0 };
      }
      linkIndex[id].maxIndex++;
      edge.linknum = linkIndex[id].maxIndex;
    });
    
    console.debug("EDGES:");
    console.debug(linkIndex);

    const linkGroup = svg.append('g').attr('class', 'links');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    const tooltip = d3.select(this.graphContainerRef.nativeElement).append("div")
    .attr('class', 'tooltip');


    const links = linkGroup
    .selectAll('path')
    .data(this.edges)
    .enter().append('path')
    .attr('stroke', (d) => colorScale(d.type))
    .attr('fill', 'none') // Prevent the path from being filled
    .attr('stroke-width', 2)
    .attr('fill', 'none');
    
    links.on('mouseenter', function(event, d) {
      tooltip
        .style('opacity', 1)
        .style('left', `${event.pageX}px`)
        .style('top', `${event.pageY}px`)
        .html(`${d.type}`); // replace with your actual node data
    })
    .on('mouseleave', function(d) {
      tooltip.style('opacity', 0);
    });
    /*const tooltip = d3.select(".graph-container").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  */
    const lineGenerator = d3.line()
        .x((d: any) => d.x)
        .y((d: any) => d.y);

    const nodes = nodeGroup.selectAll('.node-group')
        .data(this.nodes)
        .enter().append('g')
        .attr('class', 'node-group')
        .on('click', (event, nodeData) => this.displayData(nodeData));

        nodes.on('mouseenter', function(event, d) {
          // Using D3's selection to select the current node and change its cursor
          d3.select(this).style('cursor', 'pointer');
          
          // Optionally, change other styles for more visual feedback
          d3.select(this).style('fill', 'rgba(0, 128, 255, 0.8)');
        })
        .on('mouseleave', function(event, d) {
          // Reset the cursor and other styles when the mouse leaves the node
          d3.select(this).style('cursor', 'default');
          d3.select(this).style('fill', 'black');
        });

    nodes.append('circle')
    .attr('r', (d: any) => {
        const attributeCount = Object.entries(d.properties).length;
        const longestWordLength = getLongestWordLength(d.properties);
        return computeCircleRadius(attributeCount, longestWordLength);
    })
    .attr('fill', (d: any) => colorScale(d.name));

    function truncateText(text: any, maxLength: any) {
      return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  }
    nodes.append('text')
        .attr('dy', -25)
        //.attr('textLength', 45)  // Setting maximum width to a value slightly less than 50
        //.attr('lengthAdjust', 'spacingAndGlyphs')
        .style('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text((d: any) => truncateText(d.name, 10));

        nodes.each(function(d: any) {
          const node = d3.select(this);
          const attributes = Object.entries(d.properties).slice(0, 3);
          let yPosition = 5;
          const lineHeight = 15;
      
          attributes.forEach(([key, value], index) => {
              node.append('text')
                  .attr('dy', yPosition + (index * lineHeight))
                  .attr('dx', 0)
                  .attr('lengthAdjust', 'spacingAndGlyphs')
                  .style('text-anchor', 'middle')
                  .text(`${truncateText(key, 6)}: ${truncateText(value, 5)}`);
          });
      });
      function linkArc(d: any) {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        // Retrieve the link info based on the edge's id
        const linkInfo = linkIndex[[d.source.id, d.target.id].sort().join("-")];
        const totalLinks = linkInfo.total; // Make sure total is being updated somewhere in the code, or use maxIndex if you're using it to count links
        const linkNumber = d.linknum; // Use the correct property that you assigned during edge setup
      
        // The offset calculation might need to be tweaked depending on the desired distance between links
        let offset = (linkNumber - (totalLinks - 1) / 2) * 30; // Modify the multiplier for the curve spread
        if(linkNumber % 2 == 0){
          offset *= -1
        }
        let qx = d.source.x + dx / 2 + offset;
        let qy = d.source.y + dy / 2 + offset;
        if(totalLinks == 1){
          qx = 0;
          qy = 0;
        }
        return `M${d.source.x},${d.source.y}Q${qx},${qy} ${d.target.x},${d.target.y}`;
      }
      simulation.on('tick', () => {
        links.attr('d', linkArc);
        nodes.attr('transform', d => `translate(${d.x},${d.y})`); // Update the node positions
      });

    this.svg = svg;
    this.zoomBehavior = zoomBehavior;
}

createClusterGraph() {
  const svgWidth = window.innerWidth;
  const svgHeight = window.innerHeight;

  // Nodes: Count and consolidate based on type
  let nodeCounts: { [key: string]: number } = {};
  this.nodes.forEach(node => {
      let type = node.name;
      if (nodeCounts[type]) {
          nodeCounts[type]++;
      } else {
          nodeCounts[type] = 1;
      }
  });

  let clusterNodes = Object.keys(nodeCounts).map(type => ({
      id: type,
      name: type,
      properties: {
          amount: nodeCounts[type]
      },
  }));

  // Edges: Count and consolidate based on source-target-type
  let linkCounts: { [key: string]: { count: number, type: string } } = {};
  this.edges.forEach(edge => {
      let edgeSource: any;
      let edgeTarget: any;
      if(edge.source.id == undefined){
        edgeSource = edge.source;
        edgeTarget = edge.target;
      }else{
        edgeSource = edge.source.id;
        edgeTarget = edge.target.id;
      }
      const sourceType = this.nodes.find(node => node.id === edgeSource)?.name;
      const targetType = this.nodes.find(node => node.id === edgeTarget)?.name;

      if ((sourceType && targetType) && (sourceType != targetType)) {
          const key = `${sourceType}-${targetType}-${edge.type}`;

          if (linkCounts[key]) {
              linkCounts[key].count++;
          } else {
              linkCounts[key] = { count: 1, type: edge.type };
          }
      }
  });

  const consolidatedEdges = Object.entries(linkCounts).map(([key, info]) => {
      const [source, target, type] = key.split('-');
      return {
          source,
          target,
          type: info.type,
          count: info.count
      };
  });
  const nodeById: any = {};
clusterNodes.forEach((node) => {
  nodeById[node.id] = node;
});

consolidatedEdges.forEach((d: any, i) => {
    d.source = nodeById[d.source];
    d.target = nodeById[d.target];

    if (!d.source.linkCount) {
        d.source.linkCount = {};
    }

    if (d.source.linkCount[d.target.id]) {
      if(d.source.id > d.target.id){
        d.source.linkCount[d.target.id]+=1;
      }
        d.source.linkCount[d.target.id]+=1;
    } else {
        d.source.linkCount[d.target.id] = 1;
    }
    console.debug("CONSOLIDATED EDGES:")
    console.debug(consolidatedEdges);
    // Store the index of this link among the links between the same nodes
    d.linkIndex = d.source.linkCount[d.target.id] - 1;
});
consolidatedEdges.forEach((d: any, i) => {
  if(d.source.id > d.target.id){
    d.source.linkCount[d.target.id] *= -1;
  }
});
function linkArc(d: any) {
    const dx = d.target.x - d.source.x,
      dy = d.target.y - d.source.y,
      dr = Math.sqrt(dx * dx + dy * dy);
    const offset = (d.linkIndex - d.source.linkCount[d.target.id] / 2) * 70;
    console.debug("CALCULATED OFFSET:")
    console.debug(offset); 
    const qx = d.source.x + dx / 2 + offset, qy = d.source.y + dy / 2 + offset;
    return `M${d.source.x},${d.source.y}Q${qx},${qy} ${d.target.x},${d.target.y}`;
  }

  // Extract unique node types and edge types
  const nodeTypes = [...new Set(this.nodes.map(node => node.name))];
  const edgeTypes = [...new Set(this.edges.map(edge => edge.type))];
  const allTypes = [...nodeTypes, ...edgeTypes]; // Combine node and edge types.

  // Generate colors for all unique types.
  const colors = this.generateColors(allTypes.length); 
  const colorScale = d3.scaleOrdinal(colors).domain(allTypes);

  // D3 setup
  const svg = d3.select(this.svgRef.nativeElement)
      .style('background-color', 'transparent')
      .attr('width', svgWidth)
      .attr('height', svgHeight);

  svg.selectAll('.nodes').remove();
  svg.selectAll('.links').remove();
  const zoomBehavior = d3.zoom()
      .extent([[0, 0], [svgWidth, svgHeight]])
      .scaleExtent([0.1, 8])
      .on('zoom', (event: any) => {
          linkGroup.attr('transform', event.transform);
          nodeGroup.attr('transform', event.transform);
      });

  svg.call(zoomBehavior);

  const simulation = d3.forceSimulation(clusterNodes as any)
      .force('link', d3.forceLink(consolidatedEdges).id((d: any) => d.id).distance(2000))
      .force('charge', d3.forceManyBody().strength(-2000))
      .force('center', d3.forceCenter(svgWidth / 2, svgHeight / 2))
      .force('collision', d3.forceCollide().radius(400));

  const linkGroup = svg.append('g').attr('class', 'links');
  const nodeGroup = svg.append('g').attr('class', 'nodes');
  
  const links = linkGroup
    .selectAll('path')
    .data(consolidatedEdges)
    .enter().append('path')
    .attr('stroke', (d) => colorScale(d.type))
    .attr('text-anchor', 'middle')
    .attr('fill', 'none') // Prevent the path from being filled
    .attr('stroke-width', 2)
    .attr('fill', 'none');

  links.attr('d', linkArc)
    .attr('id', (d, i) => 'linkPath' + i);

    const tooltip = d3.select(this.graphContainerRef.nativeElement).append("div")
    .attr('class', 'tooltip');
    links.on('mouseenter', function(event, d) {
      tooltip
        .style('opacity', 1)
        .style('left', `${event.pageX}px`)
        .style('top', `${event.pageY}px`)
        .html(`${d.type}`); // replace with your actual node data
    })
    .on('mouseleave', function(d) {
      tooltip.style('opacity', 0);
    });
  linkGroup.selectAll('.link-text')
    .data(consolidatedEdges)
    .enter()
    .append('text')
    .attr('class', 'link-text')
    .append('textPath') // Append a textPath element
    .attr('xlink:href', (d, i) => '#linkPath' + i) // This references the unique ID of the path
    .style("text-anchor", "middle") // To center the text on the path
    .attr('startOffset', '50%') // To offset the text to the middle of the path
    .text((d) => `${d.type}: ${d.count}`);
  
  const linkText = linkGroup
  .selectAll('.link-text')
  .data(consolidatedEdges)
  .enter().append('text')
  .attr('class', 'link-text')
  .attr('text-anchor', 'middle') // Ensure the anchor of the text is in the middle
  .text((d) => `${d.type}: ${d.count}`); // Set the text only once

  linkText
    .attr('x', (d: any) => {
      return (d.source.x + d.target.x) / 2; // Midpoint x of the source and target
    })
    .attr('y', (d: any) => {
      return (d.source.y + d.target.y) / 2; // Midpoint y of the source and target
   })
    .attr('dy', '.35em') // Center the text vertically
    .attr('transform', (d: any) => {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const rotation = Math.atan2(dy, dx) * (180 / Math.PI); // Calculate the correct rotation
      const px = (d.source.x + d.target.x) / 2; // Midpoint x for rotation
      const py = (d.source.y + d.target.y) / 2; // Midpoint y for rotation
      return `rotate(${rotation},${px},${py})`; // Rotate around the midpoint
    });
          
  const nodes = nodeGroup.selectAll('.node-group')
      .data(clusterNodes)
      .enter().append('g')
      .attr('class', 'node-group')
      .on('click', (event, nodeData) => this.displayNodes(nodeData));
      nodes.on('mouseenter', function(event, d) {
        // Using D3's selection to select the current node and change its cursor
        d3.select(this).style('cursor', 'pointer');
        
        // Optionally, change other styles for more visual feedback
        d3.select(this).style('fill', 'rgba(0, 128, 255, 0.8)');
      })
      .on('mouseleave', function(event, d) {
        // Reset the cursor and other styles when the mouse leaves the node
        d3.select(this).style('cursor', 'default');
        d3.select(this).style('fill', 'black');
      });

  nodes.append('circle')
      .attr('r', 50)
      .attr('fill', (d) => colorScale(d.name));

  nodes.append('text')
      .attr('dy', -25)
      .style('text-anchor', 'middle')
      .style('font-weight', 'bold')
      .text((d) => `${d.name}: ${d.properties.amount}`);

      simulation.on('tick', () => {
        links.attr('d', linkArc);
        
        nodes.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    });

  this.svg = svg;
  this.zoomBehavior = zoomBehavior;

  // Prepare data for modal window display
  const nodeTypesWithColors = nodeTypes.map(nodeType => ({
    nodeType: nodeType,
    color: colorScale(nodeType),
    length: this.getNodeCount(nodeType)
  }));

  const edgeTypesWithColors = edgeTypes.map(edgeType => ({
    relType: edgeType,
    color: colorScale(edgeType),
    length: this.getEdgeCount(edgeType)
  }));

  // Emit the combined data (types and colors) for the modal
  this.nodeInfo.emit([nodeTypesWithColors, edgeTypesWithColors]);
}
  increaseZoom() {
    // Get the current transform
    const currentTransform = d3.zoomTransform(this.svg.node());
    
    // Increase the scale factor
    const newScale = currentTransform.k * 1.2; // You can adjust the zoom factor as needed
  
    // Create a new transform
    const newTransform = d3.zoomIdentity
      .translate(currentTransform.x, currentTransform.y)
      .scale(newScale);
  
    // Apply the new transform with a smooth transition
    this.svg.transition().duration(250).call(this.zoomBehavior.transform, newTransform);
  }
  
   decreaseZoom() {
    // Get the current transform
    const currentTransform = d3.zoomTransform(this.svg.node());
  
    // Decrease the scale factor
    const newScale = currentTransform.k / 1.2; // You can adjust the zoom factor as needed
  
    // Create a new transform
    const newTransform = d3.zoomIdentity
      .translate(currentTransform.x, currentTransform.y)
      .scale(newScale);
  
    // Apply the new transform with a smooth transition
    this.svg.transition().duration(250).call(this.zoomBehavior.transform, newTransform);
  }
}
