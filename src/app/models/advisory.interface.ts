export interface Advisory {
  id?: string;              
  programmerId: string;    
  programmerName: string;   
  

  clientName: string;
  clientEmail: string;
  

  date: string;             
  time: string;            
  topic?: string;          
  

  status: 'Pendiente' | 'Aprobada' | 'Rechazada'; 
  responseMessage?: string; 
}