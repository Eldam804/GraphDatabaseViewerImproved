import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-analytics-drawer',
  templateUrl: './analytics-drawer.component.html',
  styleUrls: ['./analytics-drawer.component.css'],
})
export class AnalyticsDrawerComponent {
  arrayOfObjects: any = {};
  constructor(
      public dialogRef: MatDialogRef<AnalyticsDrawerComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any
    ) {
      this.getStructuredData(data);
    }

     getStructuredData(data: any) {
      for (let index = 0; index < data.length; index++) {
        const name = data[index].name;
        console.debug(name)
        if(!this.arrayOfObjects[name]){
          this.arrayOfObjects[name] = [];
        }
        const properties = data[index].properties;
        const numericProps: any = {};
        for (const key in properties) {
            const value = properties[key];

            if (!isNaN(Number(value))) {
                numericProps[key] = Number(value);
            }
        }
      if (Object.keys(numericProps).length > 0) {
        //@ts-ignore
        const existingGroup = this.arrayOfObjects[name].find(group =>
            JSON.stringify(Object.keys(group[0]).sort()) === JSON.stringify(Object.keys(numericProps).sort())
        );

        if (existingGroup) {
            existingGroup.push(numericProps);
        } else {
            this.arrayOfObjects[name].push([numericProps]);
        }
      }
      }
    }
    computeStatisticsByAttribute(group: any): Record<string, Record<string, number>> {
      if (!Array.isArray(group) || group.length === 0) {
        return {}; // If group is not an array or empty, return an empty object
      }
    
      const stats: Record<string, Record<string, number>> = {};
    
      for (const item of group) {
        if (!item || typeof item !== 'object') continue; // Skip invalid entries
    
        for (const attr in item) {
          if (typeof item[attr] !== 'number') continue; // Ensure it's numeric
    
          if (!stats[attr]) {
            stats[attr] = {
              "Minimum": Infinity,
              "1st Quartile (Q1)": 0,
              "Median (Q2)": 0,
              "Mean": 0,
              "3rd Quartile (Q3)": 0,
              "Maximum": -Infinity,
              "Standard Deviation": 0,
              //@ts-ignore
              values: [] // Store raw values temporarily
            };
          }
          //@ts-ignore
          stats[attr].values.push(item[attr]);
        }
      }
    
      // Compute statistics
      for (const attr in stats) {
        //@ts-ignore
        if (!stats[attr].values || stats[attr].values.length === 0) continue;
        //@ts-ignore
        const values = stats[attr].values.sort((a, b) => a - b);
        //@ts-ignore
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
    
        stats[attr]["Minimum"] = values[0];
        stats[attr]["1st Quartile (Q1)"] = this.calculateQuantile(values, 0.25);
        stats[attr]["Median (Q2)"] = this.calculateMedian(values);
        stats[attr]["Mean"] = mean;
        stats[attr]["3rd Quartile (Q3)"] = this.calculateQuantile(values, 0.75);
        stats[attr]["Maximum"] = values[values.length - 1];
        stats[attr]["Standard Deviation"] = this.calculateStandardDeviation(values, mean);
    
        delete stats[attr].values; // Remove raw values to keep the object clean
      }
    
      return stats;
    }
    
    
    private calculateMedian(data: any[]): any {
      const mid = Math.floor(data.length / 2);
      return data.length % 2 === 0 ? (data[mid - 1] + data[mid]) / 2 : data[mid];
    }
  
    private calculateQuantile(data: any[], quantile: any): any {
      const pos = (data.length - 1) * quantile;
      const base = Math.floor(pos);
      const rest = pos - base;
  
      return base + 1 < data.length
        ? data[base] + rest * (data[base + 1] - data[base])
        : data[base];
    }
  
    private calculateStandardDeviation(data: any[], mean: any): any {
      const variance =
        data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
        (data.length - 1);
      return Math.sqrt(variance);
    }
    objectKeys(obj: any): string[] {
      return Object.keys(obj);
    }
    objectEntries(obj: any): { key: string; value: any }[] {
      return Object.entries(obj).map(([key, value]) => ({ key, value }));
    }
}
