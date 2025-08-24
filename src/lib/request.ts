declare global {
  interface Window {
    GM_xmlHttpRequest?: (options: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

interface GMRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: FormData | Blob | string | null;
  responseType?: 'text' | 'blob' | 'arraybuffer' | 'json';
  onprogress?: (response: { lengthComputable: boolean; loaded: number; total: number }) => void;
  onload?: (response: GMRequestResponse) => void;
  onerror?: (error: Error) => void;
  onabort?: () => void;
}

interface GMRequestResponse {
  status: number;
  statusText: string;
  responseText: string;
  response: Blob | ArrayBuffer | string | object | null;
  responseHeaders: string;
}

interface RequestWithAbort extends Promise<GMRequestResponse> {
  abort: () => void;
}

function hasGMHttpRequest(): boolean {
  return typeof window.GM_xmlHttpRequest === 'function';
}

function sendWithGM(options: GMRequestOptions): RequestWithAbort {
  let gmRequest: { abort?: () => void } | undefined;

  const promise = new Promise<GMRequestResponse>((resolve, reject) => {
    const gmOptions = {
      method: options.method,
      url: options.url,
      headers: options.headers || {},
      data: options.data,
      responseType: options.responseType || "text",
      onprogress: options.onprogress,
      onload: (response: GMRequestResponse) => {
        if (response.status >= 200 && response.status < 300) {
          if (options.onload) {
            try {
              options.onload(response);
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
              return;
            }
          }
          resolve(response);
        } else {
          reject(
            new Error(
              `HTTP error Status: ${response.status} ${response.statusText}. Response: ${response.responseText}`
            )
          );
        }
      },
      onerror: (error: Error) => {
        try {
          if (options.onerror) {
            options.onerror(error);
          }
          reject(error);
        } catch (callbackError) {
          reject(
            callbackError instanceof Error
              ? callbackError
              : new Error(String(callbackError))
          );
        }
      },
      onabort: () => {
        const error = new Error("Request aborted by user");
        try {
          if (options.onabort) {
            options.onabort();
          }
          reject(error);
        } catch (callbackError) {
          reject(
            callbackError instanceof Error
              ? callbackError
              : new Error(String(callbackError))
          );
        }
      },
    };

    gmRequest = window.GM_xmlHttpRequest!(gmOptions) as { abort?: () => void };
  }) as RequestWithAbort;

  promise.abort = () => {
    if (gmRequest && gmRequest.abort) {
      gmRequest.abort();
    }
  };

  return promise;
}

function sendWithXHR(options: GMRequestOptions): RequestWithAbort {
  let xhr: XMLHttpRequest;

  const promise = new Promise<GMRequestResponse>((resolve, reject) => {
    xhr = new XMLHttpRequest();

    if (options.onprogress) {
      const progressHandler = (e: ProgressEvent) => {
        options.onprogress!({
          lengthComputable: e.lengthComputable,
          loaded: e.loaded,
          total: e.total
        });
      };

      if (options.method === 'POST' || options.method === 'PUT') {
        xhr.upload.addEventListener('progress', progressHandler);
      } else {
        xhr.addEventListener('progress', progressHandler);
      }
    }

    if (options.responseType === 'blob') {
      xhr.responseType = 'blob';
    } else if (options.responseType === 'arraybuffer') {
      xhr.responseType = 'arraybuffer';
    } else if (options.responseType === 'json') {
      xhr.responseType = 'json';
    }

    xhr.onload = () => {
      const response: GMRequestResponse = {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText,
        response: xhr.response as Blob | ArrayBuffer | string | object | null,
        responseHeaders: xhr.getAllResponseHeaders(),
      };

      if (response.status >= 200 && response.status < 300) {
        if (options.onload) {
          try {
            options.onload(response);
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }
        }
        resolve(response);
      } else {
        reject(
          new Error(
            `HTTP error Status: ${response.status} ${response.statusText}. Response: ${response.responseText}`
          )
        );
      }
    };

    xhr.onerror = () => {
      const error = new Error('Network error occurred');
      try {
        if (options.onerror) {
          options.onerror(error);
        }
        reject(error);
      } catch (callbackError) {
        reject(callbackError instanceof Error ? callbackError : new Error(String(callbackError)));
      }
    };

    xhr.onabort = () => {
      const error = new Error('Request aborted by user');
      try {
        if (options.onabort) {
          options.onabort();
        }
        reject(error);
      } catch (callbackError) {
        reject(callbackError instanceof Error ? callbackError : new Error(String(callbackError)));
      }
    };

    xhr.open(options.method, options.url, true);

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        xhr.setRequestHeader(key, value);
      }
    }

    xhr.send(options.data || null);
  }) as RequestWithAbort;

  promise.abort = () => {
    if (xhr && xhr.readyState !== XMLHttpRequest.DONE) {
      xhr.abort();
    }
  };

  return promise;
}

export function makeRequest(options: GMRequestOptions): RequestWithAbort {
  if (hasGMHttpRequest()) {
    return sendWithGM(options);
  } else {
    return sendWithXHR(options);
  }
}

export type { GMRequestOptions, GMRequestResponse, RequestWithAbort };
