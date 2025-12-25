import Snaphots from "./record/Snaphots";
import MotionDetector from "./motion/MotionDetector";
import EventHandler, { NETWORK_AUTH_SUCCESS, STREAM_RECEIVED, USER_PROCEEDED } from "./utils/Events";  
import StreamProvider from "./network/StreamProvider";
import View from "./view/View";
import Console from "./utils/Console";
import RestService from "./network/RestService";
import Authentification from "./auth/Authentification";
import Controls from "./view/Controls";
import Sounds from "./utils/Sounds";
import * as Utils from './utils/Utils';
import Matrix from "./view/Matrix";
import Model from "./store/Model";

const route = (): string => window.location.search?.substring(1); 

class Entry {

  private stream: any;

    constructor() {     

      Model.initialize();

      switch (route()) {
        case ('show'): {
          this.initializeView();
          break;
        }

        default: {
          this.initializeAuth();
          break;
        }
      }
    }

    private initializeAuth = async () => {

      Utils.tryResizeWindow();

      await Console.initialize();

      await Authentification.initialize();
            Authentification.addEventListener(NETWORK_AUTH_SUCCESS, () => this.initializeView());
    }
    

    private initializeView = async () => {
      await View.initialize();
            View.addEventListener(USER_PROCEEDED, () => this.initializeRoutes());
    }

    private initializeRoutes = async () => {

      switch (route()) {
        case ('mix'): {
          this.initializeIntegratedComponents();
          break;
        }
        case ('proxy'): {
          this.initializeProxyComponents();
        }
        default: {
          this.initializeComponents();
          break;
        }
      }
    }

    private initializeRemoteStream = async () => {
      console.log('[Entry] initializeRemoteStream importing streamer...');

      const { Streamer } = await System.import('https://html-peer-streamer.onrender.com/index.js'); 

      const streamer = new Streamer();
      
      console.log('[Entry] initializeRemoteStream streamer imported. created instance. initializing...');

      const {
        peerId,
        primaryStream,
        streams,
        qualities,
        stats
      } = await streamer.initialize();

     // debugger;
      return { primaryStream, streams };
    }

    private initializeProxyComponents = async () => {
      const { primaryStream, streams } = await this.initializeRemoteStream();
      console.log('[Entry] initializeIntegratedComponents initializing StreamProvider...');
      await StreamProvider.initialize(true, streams);
      
      console.log('[Entry] initializeIntegratedComponents displaying stream');

      View.displayStream((this.stream = primaryStream));
    }

    private initializeIntegratedComponents = async () => {
      const { primaryStream, streams } = await this.initializeRemoteStream();
      console.log('[Entry] initializeIntegratedComponents initializing StreamProvider...');
      await StreamProvider.initialize(true, streams);

      console.log('[Entry] initializeIntegratedComponents displaying stream');

      View.displayStream((this.stream = primaryStream));
      Controls.setVisible(true);

      await this.initializeCommonComponents();
    }


    private initializeComponents = async () => {   
      await StreamProvider.initialize();
            EventHandler.addEventListener(STREAM_RECEIVED, (data: any) => {
              View.displayStream(data.stream);
              Sounds.playStream(data.stream);
              Controls.setVisible(true);
            });

      await this.initializeCommonComponents();
    }

    private initializeCommonComponents = async () => {

      await RestService.initialize();

      await Snaphots.initialize();

      await MotionDetector.initialize();

      await Sounds.initialize();

      await Matrix.initialize();

      await Console.initialize();
    }
}

new Entry();