import boxen from 'boxen';
import 'colors';

export const log = (text = '') => {
  console.log(boxen(text, { padding: 1 }).gray);
};

export const info = (text = '') => {
  console.info(boxen(text, { padding: 1 }).blue);
};

export const warn = (text = '') => {
  console.warn(boxen(text, { padding: 1 }).yellow);
};

export const error = (text = '') => {
  console.log(boxen(text, { padding: 1 }).red);
};
