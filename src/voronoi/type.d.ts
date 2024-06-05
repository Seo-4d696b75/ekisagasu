declare module "worker-loader!*" {
  class VoronoiWorker extends Worker {
    constructor();
  }

  export default VoronoiWorker;
}