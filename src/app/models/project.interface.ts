export interface Project {
  id?: string;              
  programmerId: string;     
  
  name: string;             
  description: string;     
  

  section: 'Academico' | 'Laboral'; 
  
  participation: string;   
  technologies: string;     
  
  
  links: {
    repo: string;           
    deploy: string;         
  };
}