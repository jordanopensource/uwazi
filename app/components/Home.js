import React, { Component, PropTypes } from 'react'
import Helmet from 'react-helmet'

class Home extends Component {

	render() {
		return (
			<div>
				<Helmet title='Home' />
				<h1>Uwazi</h1>
			</div>
		)
	}
}

export default Home;
