export interface Programmer {
  id?: string;              
  name: string;             
  specialty: string;        
  description: string;      
  photoUrl: string;        
  
  availability: string;

  contact: {
    email: string;
    linkedin?: string;      
    github?: string;
    portfolioUrl?: string;
  };
}