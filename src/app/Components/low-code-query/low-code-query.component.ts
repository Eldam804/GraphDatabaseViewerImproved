import { Component, Inject, Input } from '@angular/core';
import {MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule} from '@angular/material/dialog';

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

  public selectedOperation: String = "display";
  public selectedObject: String | null = null;
  constructor(
    public dialogRef: MatDialogRef<LowCodeQueryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    for (let index = 0; index < data[0].length; index++) {
      this.nodes.push({name: data[0][index].name});
    }
    console.debug(this.nodes);
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
}
