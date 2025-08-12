/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'

// Simple test to verify Jest setup is working
describe('Jest Setup', () => {
  it('should be able to run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to DOM testing utilities', () => {
    const TestComponent = () => React.createElement('div', null, 'Hello World')
    render(React.createElement(TestComponent))
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('should have access to Jest mocks', () => {
    const mockFn = jest.fn()
    mockFn('test')
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  it('should have localStorage mock available', () => {
    localStorage.setItem('test', 'value')
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value')
  })
})
