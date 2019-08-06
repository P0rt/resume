import React from "react";
import { render } from "react-dom";
import { Block } from './components/Resume/resume';

const App = () => (
    <Block />
);

render(<App />, document.getElementById("root"));
