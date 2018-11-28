import React from "react";
import styles from './index.css';
import { render } from "react-dom";
import { Rnd } from "react-rnd";
import logo from './img/sd.jpg'

const App = () => (
    <div>
        <Rnd
            className="kek kek--first"
            default={{
                x: 400,
                y: 200,
                width: '63%',
                height: '60%'
            }}
        >
            <div>
                <h3>Technical skills</h3>
            </div>
        </Rnd>
        <Rnd
            className="kek kek--second"
            default={{
                x: 300,
                y: 100,
                width: 809,
                // height: 458
            }}
        >
            <div className="line">
                <div className="line__ring"></div>
            </div>
            <div className="block">
                <img className="images image--cover" src={logo} alt={"logo"}/>
                <div>
                <h3>Sergey Parfenov</h3>
                    <div>
                        <h4>Now i am</h4>
                        <p>Learning Specialist at <a href="https://www.yandex.ru/">Yandex</a></p>
                        <p>Teacher at <a href="https://kruzhok.io/">Kruzhok</a></p>
                    </div>
                    <div>
                        <h4>While ago i was</h4>
                        <p>Frontend developer at <a href="https://www.sravni.ru/">Sravni.ru</a></p>
                        <p>Frontend developer at <a href="">Spaces.ru</a></p>
                        <p>Teacher assistant at <a href="https://moscoding.ru/">Moscow Coding School</a></p>
                    </div>
                </div>
            </div>
        </Rnd>
    </div>
);

render(<App />, document.getElementById("root"));
