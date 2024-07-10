import { Component, Inject } from '@angular/core';
import {MatDialog, MAT_DIALOG_DATA, MatDialogRef, MatDialogModule} from '@angular/material/dialog';

@Component({
  selector: 'app-low-code-query',
  templateUrl: './low-code-query.component.html',
  styleUrls: ['./low-code-query.component.css']
})
export class LowCodeQueryComponent {
  public lowCode: Boolean = false;
  public gptBuilder: Boolean = false;
  constructor(
    public dialogRef: MatDialogRef<LowCodeQueryComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

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
