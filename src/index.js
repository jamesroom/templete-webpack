import {Component} from 'react';
import {render} from 'react-dom';

require('./index.less');

class App extends Component {
  render () {
    return (
      <div className="app-component">
        <b>this page build with <strong>webpack</strong> and used <strong>react</strong> framework!!</b>
      </div>
    );
  }
}
render(<App/>, document.getElementById('demo'));
