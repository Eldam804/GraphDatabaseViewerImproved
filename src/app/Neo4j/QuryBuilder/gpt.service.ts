import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GptService {

  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private apiKey = 'MY_API_KEY';

  constructor(private http: HttpClient) {}

  generateQuery(prompt: String): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    });

    const body = {
      model: 'gpt-4', // Use 'gpt-3.5-turbo' or 'gpt-4' depending on your subscription
      messages: [
        { role: 'user', content: `Generate a query for the following prompt in Cypher(Neo4j): "${prompt}". Only return the query without any additional text.` }
      ],
      max_tokens: 150,
    };

    return this.http.post<any>(this.apiUrl, body, { headers })
    .pipe(
      map(response => {
        // Check if the response has choices and if the content is defined
        if (response.choices && response.choices.length > 0 && response.choices[0].message) {
          return response.choices[0].message.content.trim();
        } else {
          console.debug(response)
        }
      }))
  }
}