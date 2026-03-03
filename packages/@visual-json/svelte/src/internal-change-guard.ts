export interface InternalChangeGuard {
  markInternal(): number;
  shouldHandleExternalSync(token: number): boolean;
}

export function createInternalChangeGuard(): InternalChangeGuard {
  let nextToken = 1;
  let highestIssuedToken = 0;
  let highestConsumedToken = 0;

  return {
    markInternal() {
      const token = nextToken++;
      highestIssuedToken = token;
      return token;
    },
    shouldHandleExternalSync(token) {
      if (token > highestConsumedToken && token <= highestIssuedToken) {
        highestConsumedToken = token;
        return false;
      }
      return true;
    },
  };
}
