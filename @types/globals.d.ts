export {};
declare global {
  interface Window {
    openSimplifiedLoginWidget?: (initialParams: any, loginHandler: any, loginNotYouHandler: any) => void;
  }
}
