
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

function customizedPromise(cb) {
    console.log("new keyword to create the promise")
    let self = this
    self.value = null;
    self.error = null;
    self.status = PENDING;
    self.onFulfilledCallBack = [];
    self.onRejectedCallBack = [];

    function resolve(value) {
        // be careful about setTimeout's this
        console.log("call resolve function in setTimeout")

        setTimeout(() => {
            if (self.status === PENDING) {
                self.status = FULFILLED;
                self.value = value;
                console.log("im promise resolve")
                console.log(self.onFulfilledCallBack)
                self.onFulfilledCallBack.forEach(cb => cb(value))
            }
        })
    }

    function reject(error) {

        console.log("call reject function in setTimeout")

        setTimeout(() => {
            //actually here setting status is for later use
            if (self.status === PENDING) {
                self.status = REJECTED;
                self.error = error;
                self.onRejectedCallBack.forEach(cb => cb(error))
            }
        })
    }

    try {
        cb(resolve, reject)
    } catch (e) {
        reject(e)
    }

}

// be careful about arrow function's this if you define then function as an arrow function
// it will point to the window
customizedPromise.prototype.then = function (onFulfilled, onRejected) {
    console.log("define callback functions in then")

    let self = this;
    // console.log(self)
    let bridgePromise;

    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : value => value;
    onRejected = typeof onRejected === "function" ? onRejected : error => { throw error };

    // console.log(onFulfilled)
    // console.log(onRejected)

    if (self.status === FULFILLED) {
        return bridgePromise = new customizedPromise((resolve, reject) => {
            setTimeout(() => {
                try {
                    let x = onFulfilled(self.value);
                    resolvePromise(bridgePromise, x, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            });
        })
    }
    if (self.status === REJECTED) {
        return bridgePromise = new customizedPromise((resolve, reject) => {
            setTimeout(() => {
                try {
                    let x = onRejected(self.error);
                    resolvePromise(bridgePromise, x, resolve, reject);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    if (self.status === PENDING) {
        return bridgePromise = new customizedPromise((resolve, reject) => {
            console.log("when the bridge promise is defined")
            console.log("Fulfill call back array are filled with call back functions")
            self.onFulfilledCallBack.push((value) => {
                try {
                    console.log("bridged value")
                    console.log(value)
                    // value passed from P's resolved value, pass into f1, and execute f1
                    // define another promise, and using .then method on it in the resolvePromise function etc
                    let x = onFulfilled(value);
                    console.log("x should be a value return by onFulfill callback", x)
                    resolvePromise(bridgePromise, x, resolve, reject);
                } catch (e) {
                    console.log("throw new error in the fulfill callback")
                    reject(e);
                }
            });
            self.onRejectedCallBack.push((error) => {
                try {
                    let x = onRejected(error);
                    resolvePromise(bridgePromise, x, resolve, reject);
                } catch (e) {
                    console.log("throw new error in the reject callback")
                    reject(e);
                }
            });
        });
    }
}

function resolvePromise(bridgePromise, x, resolve, reject) {

    let called = false;
    //如果x是一个promise

    if (bridgePromise === x) {
        return reject(new TypeError('chaining cycle detected'));
    }

    if (x != null && ((typeof x === 'object') || (typeof x === 'function'))) {
        try {
            // 是否是thenable对象（具有then方法的对象/函数）
            //2.3.3.1 将 then 赋为 x.then
            let then = x.then;
            if (typeof then === 'function') {
                //2.3.3.3 如果 then 是一个函数，以x为this调用then函数，且第一个参数是resolvePromise，第二个参数是rejectPromise
                console.log("then is a function")
                then.call(x, y => {
                    console.log("it's not reaching here, hence no circular reference")
                    if (called) return;
                    called = true;
                    resolvePromise(bridgePromise, y, resolve, reject);
                }, error => {
                    if (called) return;
                    called = true;
                    reject(error);
                })
            } else {
                //2.3.3.4 如果 then不是一个函数，则 以x为值fulfill promise。
                resolve(x);
            }
        } catch (e) {
            //2.3.3.2 如果在取x.then值时抛出了异常，则以这个异常做为原因将promise拒绝。
            if (called) return;
            called = true;
            reject(e);
        }
    }
    else {
        console.log("x should be a primitive value")
        console.log("it resolves")
        resolve(x);
    }
}

customizedPromise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected);
}

customizedPromise.resolve = function (value) {
    return new customizedPromise(resolve => {
        resolve(value);
    });
}

customizedPromise.reject = function (reason) {
    return new customizedPromise((resolve, reject) => {
        reject(reason);
    });
}


customizedPromise.all = function (promises) {
    return new customizedPromise((resolve, reject) => {
        let numOfPromises = promises.length;
        let timer = 0
        let results = [];
        for(let i = 0; i< numOfPromises; i++) {
            promises[i].then((result) => {
                results.push(result)
                timer++
                if(timer === numOfPromises){
                    resolve(results)
                }
            },(err) => {
                reject(err)
            })
        }
    })
}

customizedPromise.race = function (promises) {
    return new customizedPromise((resolve, reject) => {
        let numOfPromises = promises.length;
        for(let i = 0; i< numOfPromises; i++) {
            promises[i].then((result) => {
                resolve(result)
            },(err) => {
                reject(err)
            })
        }
    })
}



/* promisify a async callback function like fs.readFile to have the structure of promise */

customizedPromise.promisify = function (func) {

    return function () {
        let args = Array.from(arguments);
        return new customizedPromise((resolve, reject) => {
            let cb = function (err, data) {
                if (err) {
                    reject(err)
                } else {
                    resolve(data)
                }
            }
            func.apply(null, args.concat(cb))
        })
    }
}

customizedPromise.cancellable = function (promise) {

    let cancelled = false;

    let wrapperPromise = new customizedPromise((resolve, reject) => {
        promise.then(value => cancelled? reject("promise cancelled") : resolve(value), err => cancelled? reject("promise cancelled") : reject(err))
    })

  return {
    wrapperPromise: wrapperPromise,
    cancel: () => cancelled = true
  }
}


/*  parallel asynchronous tasks tests  */

// let p = new customizedPromise((resolve, reject) => {
//     setTimeout(() => resolve('P1'), 1000)
// });
// let f1 = function (data) {
//     console.log(data)
//     return new customizedPromise((resolve, reject) => {
//         setTimeout(() => resolve('F1'), 2000)
//     });
// }
// let f2 = function (data) {
//     console.log(data)
//     return new customizedPromise((resolve, reject) => {
//         setTimeout(() => resolve('F2'), 2000)
//     });
// }
// let f3 = function (data) {
//     console.log("in F3 synchronous")
//     console.log(data);
// }
// let errorLog = function (error) {
//     console.log(error)
// }
// p.then(f1).then(f2).then(f3).catch(errorLog)
// p.then(f1).then((data) => console.log("data 1",data)).then((data) => console.log("data", data))


/*  circular promise chaining tests  */

// let p = new customizedPromise((resolve, reject) => {
//     resolve(1)
// })

// let testPromise = p.then(value => { return testPromise })

// testPromise.then(data => console.log(data))


/*  integrated test concerning event loop/ error handling/ promise status  */
// const promise = new customizedPromise((resolve, reject) => {
//     console.log(1)
//     resolve()
//     console.log(2)
//   })
//   promise.then(() => {
//     console.log(3)
//   })
//   console.log(4)


// const promise1 = new customizedPromise((resolve, reject) => {
//     setTimeout(() => {
//       resolve('success')
//     }, 1000)
//   })
//   const promise2 = promise1.then(() => {
//     throw new Error('error!!!')
//   })

//   console.log('promise1', promise1)
//   console.log('promise2', promise2)

//   setTimeout(() => {
//     console.log('promise1', promise1)
//     console.log('promise2', promise2)
//   }, 2000)

/*  test the status won't change after resolve or reject */
// const promise = new customizedPromise((resolve, reject) => {
//     resolve('success1')
//     reject('error')
//     resolve('success2')
// })

// promise
//     .then((res) => {
//         console.log('then: ', res)
//     })
//     .catch((err) => {
//         console.log('catch: ', err)
//     })

/*  value will pass through, because onFulfill or onReject all have default functions as passing by values */
// customizedPromise.resolve(1)
//   .then((res) => {
//     console.log("first level promise call back",res)
//     return 2
//   })
//   .catch((err) => {
//     return 3
//   })
//   .then((res) => {
//     console.log("third level promise call back",res)
//   })

/* this one tests two thens should print the value at almost the same time */
// const promise = new customizedPromise((resolve, reject) => {
//     setTimeout(() => {
//       console.log('once')
//       resolve('success')
//     }, 1000)
//   })

//   const start = Date.now()
//   promise.then((res) => {
//     console.log(res, Date.now() - start)
//   })
//   promise.then((res) => {
//     console.log(res, Date.now() - start)
//   })

/* return a new object of error type, promise treats it as a promise object
only throw or reject will trigger error */
// customizedPromise.resolve()
//   .then(() => {
//     return new Error('error!!!')
//   })
//   .then((res) => {
//     console.log('then: ', res)
//   })
//   .catch((err) => {
//     console.log('catch: ', err)
//   })

/*  value will pass through, because onFulfill or onReject all have default functions as passing by values
2, promise.resolve(3) are not functions they will be changed into function */
// customizedPromise.resolve(1)
// .then(2)
// .then(Promise.resolve(3))
// .then((value) => console.log("last step",value))


// customizedPromise.resolve()
//   .then(function success (res) {
//     throw new Error('error')
//   }, function fail1 (e) {
//     console.error('fail1: ', e)
//   })
//   .catch(function fail2 (e) {
//     console.error('fail2: ', e)
//   })

// Promise.resolve()
//   .then(function success (res) {
//     foo.bar();
//   }, function fail1 (e) {
//     console.error('fail1: ', e)
//   })
//   .catch(function fail2 (e) {
//     console.error('fail2: ', e)
//   })


/*  treat then as asynchronous and micro task, but then is like asynchronous plus a setTimeout,
it's just setTimeout always gets in the first of the queue, so it looks like a micro task that always finishes
before any other macro task */
// Promise.resolve()
// .then(() => {
//   console.log('then')
// })
// process.nextTick(() => {
//     console.log('nextTick')
//   })
//   setImmediate(() => {
//     console.log('setImmediate')
//   })
//   console.log('end')


// let promise = new Promise((resolve,reject)=>{
//     resolve();
//  });
//  promise.then((value) => { // pending
//      return new Promise((resolve,reject)=>{
//          return new Promise((resolve,reject)=>{
//              resolve(111);
//           })
//       })
//  }, (reason) => {
//    console.log(reason);
//  });

/* node event loop vs browser event loop, node v11 has changed into the same concept, so no major difference */
// setTimeout(()=>{
//     console.log('timer1')
//     Promise.resolve().then(function() {
//         console.log('promise1')
//     })
// }, 0)
// setTimeout(()=>{
//     console.log('timer2')
//     Promise.resolve().then(function() {
//         console.log('promise2')
//     })
// }, 0)