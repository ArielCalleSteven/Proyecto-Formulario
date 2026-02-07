import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('authToken');

  console.log('------------------------------------------------');
  console.log('🕵️ INTERCEPTOR INTENTANDO ENVIAR:', req.url);
  
  if (token) {
    console.log('✅ ¡SÍ HAY TOKEN! (Empieza con):', token.substring(0, 10) + '...');
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  } else {
    console.log('❌ NO HAY TOKEN EN EL BOLSILLO (localStorage vacío)');
  }
  console.log('------------------------------------------------');

  return next(req);
};