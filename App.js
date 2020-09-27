import React, { Component } from 'react';
import axios from 'axios';
import qs from 'qs';
import {DATA_SERVER} from './config.js';
import './App.css';


var tempDiffTop = 3;
var tempDiffBottom = -3;
var humDiffTop = 3;
var humDiffBottom = -3;

class App extends Component{
  state={
    wantedTemperature : "25.00",
    wantedHumidity : "50.00",
    temperature : "25.00",
    humidity: "50.00",
    wantedGroundTemperature : "10.00",
    wantedGroundHumidity : "15.00",
    groundHumidity: "13.00",
    doorState : 2,
    waterState : 1,
    changeDoor : 2,
    changeWater : 1,
    recommendedDoorState : 2,
    recommendedWaterState : 1,
    autoMode : 0,
    changeWantedTemperature : "25.00",
    changeWantedHumidity : "50.00",
    changeWantedGroundHumidity : "15.00",
    changeAutoMode : 0
  }

  getData= (changeInputs)=>{
    axios.get(DATA_SERVER+"/get-data")
    .then(response=>{
      this.setState({
        temperature : response.data.tmp,
        humidity : response.data.hum,
        wantedTemperature : response.data.wntTmp,
        wantedHumidity : response.data.wntHum,
        groundHumidity: response.data.gHum,
        wantedGroundHumidity : response.data.wntGHum,
        doorState : parseInt(response.data.act/10),
        waterState : response.data.act%10,
        recommendedDoorState : parseInt(response.data.reccAct/10),
        recommendedWaterState : response.data.reccAct%10,
        autoMode : response.data.aut
      });
      if(changeInputs){
        this.setState({
          changeWantedHumidity : response.data.wntHum,
          changeWantedTemperature : response.data.wntTmp,
          changeWantedGroundHumidity : response.data.wntGHum,
          changeAutoMode : response.data.aut,
          changeWater : response.data.act%10,
          changeDoor : parseInt(response.data.act/10),
        });
      }
    })
    .catch(error=>{
      console.log("ERROR", error)
    })
  }

  componentDidMount(){
    this.getData(true);
    const interval = setInterval(() => {
      this.getData(false);
    }, 5000);
    
  }

  mapAction = (recommendedDoorState, recommendedWaterState)=>{
    if(recommendedDoorState==0&&recommendedWaterState==0) return "All ok.";
    else{
      let response = "";
      if(recommendedWaterState==1) response+="Ground too humid. ";
      else if(recommendedWaterState==2) response+="Ground too dry. ";
      if(recommendedDoorState==1) response+="Air temperature and humidity too high.";
      else if(recommendedDoorState==2) response+="Air temperature and humidity too low.";
      return response;
    }
  }


  mapReccAction = (recommendedDoorState, recommendedWaterState, doorState, waterState)=>{
      
    if(recommendedDoorState==0&&recommendedWaterState==0) return "No action necessary.";
    else{
      let response = "";

      if(recommendedWaterState==1){
        response+="Should close the valve. ";
        if(waterState==1) response+="(Done) ";
      } 
      else if(recommendedWaterState==2){
        response+="Should open the valve. ";
        if(waterState==2) response+="(Done) ";
      } 
      if(recommendedDoorState==1){
        response+="Should open the door.";
        if(doorState==1) response+="(Done) ";
      } 
      else if(recommendedDoorState==2){
          response+="Should close the door.";
          if(doorState==2) response+="(Done) ";
      }
      return response;
    }
  }

  mapAutoMode = (autoMode) =>{
    if(autoMode==0) return <div style={{color:"#FB3D13"}}>OFF</div>;
    else if(autoMode==1) return <div style={{color:"#4CFB13"}}>ON</div>
    else return <div style={{color:"#FB3D13"}}>UNDETERMINED</div>
  }

  sendData = () =>{
    let wntTmp = this.state.changeWantedTemperature;
    let wntHum = this.state.changeWantedHumidity;
    let wntGHum = this.state.changeWantedGroundHumidity;
    let aut = this.state.changeAutoMode;
    let act = parseInt(this.state.changeDoor)*10+parseInt(this.state.changeWater);
    let data = qs.stringify({
      wntTmp:wntTmp,
      wntHum:wntHum,
      act:act,
      aut:aut,
      wntGHum : wntGHum
    })
    axios.post(DATA_SERVER+"/settings",data)
    .catch(error=>{
      console.log("POST ERROR", error)
    })
  }

  handleTempChange = (event) =>{
    this.setState({changeWantedTemperature: event.target.value>100? 100 : event.target.value<0? 0 : event.target.value});
  }

  handleHumChange = (event) =>{
    this.setState({changeWantedHumidity: event.target.value>100? 100 : event.target.value<0? 0 : event.target.value});
  }

  handleGroundHumChange = (event) =>{
    this.setState({changeWantedGroundHumidity: event.target.value>100? 100 : event.target.value<0? 0 : event.target.value});
  }

  handleAutChange = (event) =>{
    this.setState({changeAutoMode: event.target.checked?1:0});
  }

  handleDoorChange = (event) =>{
    this.setState({changeDoor: event.target.value});
  }

  handleWaterChange = (event) =>{
    this.setState({changeWater: event.target.value});
  }

  parseStyle = (param, wantedParam, bottomDiff, topDiff) =>{
    param = parseInt(param);
    wantedParam = parseInt(wantedParam);
    bottomDiff = parseInt(bottomDiff);
    topDiff = parseInt(topDiff);
    if(param-wantedParam<bottomDiff) return {color:"#339EFF"};
    else if(param-wantedParam>topDiff) return {color:"#FB3D13"};
    else return {color:"#4CFB13"};
  }

  render(){
    return (
      <div className="main_wrapper">
        <header>
          Loshmey's temperature and humidity project
        </header>
        <div className="main_body">
          <div className = "data_wrapper">
            <div className="data_container">
              <div className="img_container">
                <img src="temperature_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                AIR TEMPERATURE:<br></br><div className="data_text" style={this.parseStyle(this.state.temperature, this.state.wantedTemperature, tempDiffBottom, tempDiffTop )}>{this.state.temperature}{this.state.temperature=="no_data"? null : '\u2103'}</div>
              </div>
            </div>
            <div className="data_container">
              <div className="img_container">
                <img src="humidity_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                AIR HUMIDITY:<br></br><div className="data_text" style={this.parseStyle(this.state.humidity, this.state.wantedHumidity, humDiffBottom, humDiffTop )}>{this.state.humidity}{this.state.humidity=="no_data"? null : `%`}</div>
              </div>
            </div>
            <div className="data_container">
              <div className="img_container">
                <img src="soil_icon.jpg" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                GROUND HUMIDITY:<br></br><div className="data_text" style={this.parseStyle(this.state.groundHumidity, this.state.wantedGroundHumidity, humDiffBottom, humDiffTop )}>{this.state.groundHumidity}{this.state.groundHumidity=="no_data"? null : `%`}</div>
              </div>
            </div>
            <div className="data_container">
              <div className="img_container">
                <img src="state_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                STATE:<br></br><div className="data_text">{this.mapAction(this.state.recommendedDoorState, this.state.recommendedWaterState)}</div>
              </div>
            </div>
            <div className="data_container">
              <div className="img_container">
                <img src="brain_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                RECOMMENDED STATE:<br></br><div className="data_text">{this.mapReccAction(this.state.recommendedDoorState, this.state.recommendedWaterState, this.state.doorState, this.state.waterState)}</div>
              </div>
            </div>
          </div>
          <div className = "data_wrapper">
            <div className="data_container">
              <div className="img_container">
                  <img src="temperature_gauge_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                WANTED AIR TEMPERATURE:<br></br><div className="data_text">{this.state.wantedTemperature}&#8451;</div>
              </div>
            </div>
            <div className="data_container">
              <div className="img_container">
                <img src="humidity_gauge_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                WANTED AIR HUMIDITY:<br></br><div className="data_text">{this.state.wantedHumidity}%</div>
              </div>
            </div>
            <div className="data_container">
              <div className="img_container">
                <img src="soil_humidity_gauge_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                WANTED GROUND HUMIDITY:<br></br><div className="data_text">{this.state.wantedGroundHumidity}%</div>
              </div>
            </div>
            <div className="data_container">
              <div className="img_container">
                <img src="robot_icon.png" className="img-fluid"></img>
              </div>
              <div className="data_text_container">
                AUTOMATIC MODE:<br></br>{this.mapAutoMode(this.state.autoMode)}
              </div>
            </div>
          </div>
          <form className="form_wrapper">
            <div className="form-group">
              <label htmlFor="inputTemperature">Change wanted air temperature (&#8451;)</label>
              <input onChange={this.handleTempChange} type="number" min="0" max="100" step="1" className="form-control" id="inputTemperature" placeholder="Enter air temperature" value={this.state.changeWantedTemperature}></input>
            </div>
            <div className="form-group">
              <label htmlFor="inputHumidity">Change wanted air humidity (%)</label>
              <input onChange={this.handleHumChange} type="number" min="0" max="100" step="1" className="form-control" id="inputHumidity" placeholder="Enter air humidity" value={this.state.changeWantedHumidity}></input>
            </div>
            <div className="form-group">
              <label htmlFor="inputGroundHumidity">Change wanted ground humidity (%)</label>
              <input onChange={this.handleGroundHumChange} type="number" min="0" max="100" step="1" className="form-control" id="inputGroundHumidity" placeholder="Enter ground humidity" value={this.state.changeWantedGroundHumidity}></input>
            </div>

            <div className="form-group">
              <label htmlFor="selectDoor">Door control</label>
              <select onChange={this.handleDoorChange} disabled={this.state.changeAutoMode==1} value={this.state.changeDoor} className="form-control" id="selectDoor">
                <option value="1">Open door</option>
                <option value="2">Close door</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="selectWater">Water control</label>
              <select onChange={this.handleWaterChange} disabled={this.state.changeAutoMode==1} value={this.state.changeWater} className="form-control" id="selectWater">
                <option value="2">Open valve</option>
                <option value="1">Close valve</option>
              </select>
            </div>

            <div style={{paddingBottom:"5%"}} className="custom-control custom-switch">
              <input onClick={this.handleAutChange} data-toggle="toggle" className="custom-control-input"  checked={this.state.changeAutoMode==1} type="checkbox" id="autoModeCheck" value={this.state.changeAutoMode}></input> 
              <label className="custom-control-label" htmlFor="autoModeCheck">Automatic mode</label>
            </div>
            <button onClick={this.sendData} type="button" className="btn btn-primary">Submit</button>
          </form>
        </div>
        <footer>
          Developed by YouFaceJaraxxus &copy; {new Date().getFullYear().toString()}
        </footer>
      </div>
    );
  }
  
}

export default App;
