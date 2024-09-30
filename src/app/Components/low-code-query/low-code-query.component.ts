import { Component, Inject, Input } from '@angular/core';
import {MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule} from '@angular/material/dialog';
import { GptService } from 'src/app/Neo4j/QuryBuilder/gpt.service';

@Component({
  selector: 'app-low-code-query',
  templateUrl: './low-code-query.component.html',
  styleUrls: ['./low-code-query.component.css']
})
export class LowCodeQueryComponent {
  public lowCode: Boolean = false;
  public gptBuilder: Boolean = false;
  public operations: any[] = [
    {value: 'display', viewValue: 'Display'},
    {value: 'update', viewValue: 'Update'},
    {value: 'create', viewValue: 'Create'},
    {value: 'delete', viewValue: 'Delete'}
  ];

  public nodes: any[] = [];
  public edges: any[] = [];
  public nodeAttributes: any[] = [];
  public selectedOperation: String = "display";
  public selectedObject: String | null = null;
  public filter: String | null = null;
  public filterComp: String | null = null;
  public objectName: String | null = null;
  public objectAttributes: any = [{name: null, value: null}];
  public finalQuery: String | null = null;
  public updateBy: String | null = null;
  public updateNewValue: String | null = null;
  public queryPrompt: String = '';
  public queryResult: String = '';
  constructor(
    public dialogRef: MatDialogRef<LowCodeQueryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private gptService: GptService
  ) {
    for (let index = 0; index < data[0].length; index++) {
      console.debug(data[0]);
      this.nodes.push({name: data[0][index].name, properties: data[0][index].properties});
    }
  }

  filteredData(){
    let elements = [];
    for (let index = 0; index < this.nodes.length; index++) {
      if(this.nodes[index].name == this.selectedObject){
        elements.push(Object.keys(this.nodes[index].properties));
      }
    }
    this.nodeAttributes = elements;
    console.debug("NODE ATTRIBUTES")
    console.debug(this.nodeAttributes);
  }
  
  addField(){
    this.objectAttributes.push({name: null, value: null});
    console.debug(this.objectAttributes);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  openBuilder(){
    this.gptBuilder = true;

  }

  openLowCodeBuilder(){
    this.lowCode = true;
  }

  previousStep(){
    this.lowCode = false;
    this.gptBuilder = false;
  }
  createQuery(){
    if(this.selectedOperation == 'create'){
      let listOfAttrs = "";
      for (let index = 0; index < this.objectAttributes.length; index++) {
        const value = !isNaN(this.objectAttributes[index].value) ? this.objectAttributes[index].value : "\"" + this.objectAttributes[index].value + "\"";
        listOfAttrs += this.objectAttributes[index].name+": " + value;
        if(index != this.objectAttributes.length - 1){
          listOfAttrs += ",";
        }
      }
      this.finalQuery = "CREATE(:" + this.objectName + "{" + listOfAttrs + "});"; 
      console.debug(this.finalQuery);
    }else if(this.selectedOperation == 'display'){
      let query;
      query = "MATCH(N:" + this.selectedObject + ") " + "RETURN N;";
      if(this.filter != null){
        query = "MATCH(N:" + this.selectedObject + ") WHERE N." + this.filter + "=" + this.filterComp + " RETURN N;";
        
      }
      this.finalQuery = query;
    }else if(this.selectedOperation == 'delete'){
      let query;
      query = "MATCH(N:" + this.selectedObject + ") " + "RETURN N;";
      if(this.filter != null){
        query = "MATCH(N:" + this.selectedObject + ") WHERE N." + this.filter + "=" + this.filterComp + " DETACH DELETE N;";
        
      }
      this.finalQuery = query;

    }else if(this.selectedOperation == 'update'){
      let query = "MATCH(N:" + this.selectedObject + ") WHERE N." + this.filter + "=" + this.filterComp + " SET N." + this.updateBy + "=" + this.updateNewValue + ";";
      this.finalQuery = query;
    }
    
  }
  buildQuery(){
    this.gptService.generateQuery(this.queryPrompt).subscribe(response => {
      this.queryResult = response
    });
  }
}
