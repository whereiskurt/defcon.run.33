export default (config, { strapi })=> {
  return async (ctx, next) => {
    await next();
    //Pulling this one makes our Strapi incognito. :) 
    //We only use REST APIs from the application server
    ctx.remove('X-Powered-By');
    ctx.remove('Content-Security-Policy');
  };
};